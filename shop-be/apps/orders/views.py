from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.generics import ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderUpdateInfoSerializer, SellerOrderSerializer
from apps.cart.models import Cart, CartItem
from core.vnpay_config import VNPAY_CONFIG
from core.vnpay import generate_vnpay_url
from core.momo import create_momo_payment, verify_momo_signature, extract_django_order_id
from django.http import HttpResponseRedirect
import os
import hmac
import hashlib
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .utils import send_payment_email
from rest_framework import generics # THÊM DÒNG NÀY ĐỂ HẾT LỖI NameError
from rest_framework_simplejwt.authentication import JWTAuthentication # Để fix lỗi 401
from rest_framework import viewsets, permissions
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Notification
from .serializers import NotificationSerializer

# Đơn hàng "đã mua" (đã thanh toán hoặc đang/đã giao) — không hiển thị pending ở list/detail buyer
PURCHASED_ORDER_STATUSES = ('paid', 'shipped', 'delivered', 'confirmed_received')


def _deduct_stock_for_order(order):
    """Chỉ trừ kho khi đơn chuyển sang paid."""
    items = list(order.items.select_related('product').all())

    for item in items:
        product = item.product
        if item.quantity > product.quantity:
            raise ValueError(f"Sản phẩm '{product.name}' đã hết hàng hoặc không đủ số lượng")

    for item in items:
        product = item.product
        product.quantity -= item.quantity
        product.save(update_fields=['quantity'])


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic()
    def post(self, request):
        user = request.user
        cart = Cart.objects.get(user=user)
        cart_items = cart.items.all()

        if not cart_items.exists():
            return Response({"error": "Giỏ hàng của bạn đang trống."}, status=400)

        for cart_item in cart_items:
            if cart_item.product.seller_id == user.id:
                return Response(
                    {
                        "error": "Giỏ hàng có sản phẩm do bạn bán. Vui lòng xóa các sản phẩm đó khỏi giỏ trước khi đặt hàng."
                    },
                    status=400,
                )

        # Lấy thông tin từ UserProfile
        try:
            profile = user.profile
        except:
            return Response({"error": "Người dùng chưa có thông tin profile."}, status=400)

        # Kiểm tra đã có order pending chưa
        pending_order = Order.objects.filter(user=user, status='pending').first()
        if pending_order:
            # Gán lại thông tin người nhận từ profile
            pending_order.receiver_name = f"{profile.first_name} {profile.last_name}"
            pending_order.address = profile.address
            pending_order.phone = profile.phone
            pending_order.email = profile.email

            # Xóa hết OrderItem cũ
            pending_order.items.all().delete()
            # Thêm lại sản phẩm từ cart
            for cart_item in cart_items:
                OrderItem.objects.create(
                    order=pending_order,
                    product=cart_item.product,
                    quantity=cart_item.quantity,
                    price=cart_item.product.price
                )
            pending_order.update_total_price()
            pending_order.save()
            serializer = OrderSerializer(pending_order)
            return Response({
                "message": "Đã cập nhật đơn hàng đang chờ thanh toán.",
                "order": serializer.data
            }, status=200)

        # Nếu chưa có order pending, tạo mới như cũ
        order = Order.objects.create(user=user, status='pending', total_price=0)
        order.receiver_name = f"{profile.first_name} {profile.last_name}"
        order.address = profile.address
        order.phone = profile.phone
        order.email = profile.email    
        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                quantity=cart_item.quantity,
                price=cart_item.product.price
            )
        order.update_total_price()
        order.save()
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=201)


class PayOrderView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_id):
        user = request.user
        order = get_object_or_404(Order.objects.select_for_update(), id=order_id, user=user)

        if order.status != 'pending':
            return Response({"error": "Đơn hàng đã thanh toán hoặc không hợp lệ"}, status=400)

        for item in order.items.all():
            if item.product.seller_id == user.id:
                return Response(
                    {"error": "Đơn hàng chứa sản phẩm do bạn bán, không thể thanh toán."},
                    status=400,
                )

        try:
            _deduct_stock_for_order(order)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        order.status = 'paid'
        order.save()


        # Gửi email xác nhận đơn hàng (nếu có)
        try:
            send_payment_email(user, order)
        except Exception as e:
            print("Lỗi gửi email:", e)

        Cart.objects.filter(user=user).delete()

        return Response({"message": "Thanh toán thành công", "order_id": order.id, "status": order.status})


class OrderListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user)
        # Mặc định chỉ trả đơn đã mua; ?include_pending=1 để lấy cả pending (profile, tiếp tục thanh toán)
        inc = self.request.query_params.get('include_pending', '').lower()
        if inc not in ('1', 'true', 'yes'):
            qs = qs.filter(status__in=PURCHASED_ORDER_STATUSES)
        return qs.order_by('-created_at')


class OrderDetailView(RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Mọi trạng thái của chính user (checkout/paid cần đọc đơn pending)
        return Order.objects.filter(user=self.request.user)


def _seller_order_base_qs(user):
    return Order.objects.filter(items__product__seller=user).distinct()


class SellerOrderListView(ListAPIView):
    """Đơn có ít nhất một sản phẩm do user hiện tại bán (chỉ đơn đã thanh toán / giao)."""
    permission_classes = [IsAuthenticated]
    serializer_class = SellerOrderSerializer

    def get_queryset(self):
        return (
            _seller_order_base_qs(self.request.user)
            .filter(status__in=PURCHASED_ORDER_STATUSES)
            .order_by('-created_at')
        )


class SellerOrderDetailView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SellerOrderSerializer

    def get_queryset(self):
        return _seller_order_base_qs(self.request.user).filter(
            status__in=PURCHASED_ORDER_STATUSES
        )


class SellerOrderStatusView(APIView):
    """Seller cập nhật trạng thái vận chuyển cho đơn có sản phẩm của mình (cả đơn là chung)."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        order = get_object_or_404(
            _seller_order_base_qs(request.user).filter(status__in=PURCHASED_ORDER_STATUSES),
            pk=pk,
        )
        new_status = request.data.get('status')
        if new_status not in ('shipped', 'delivered'):
            return Response(
                {'error': 'Chỉ chấp nhận status: shipped hoặc delivered'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = new_status
        order.save()
        serializer = SellerOrderSerializer(order, context={'request': request})
        return Response(serializer.data)


class UpdateOrderInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user)

        if order.status != 'pending':
            return Response({"error": "chỉ cập nhật đơn hàng khi chưa thanh toán"})

        serializer = OrderUpdateInfoSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Cập nhật thông tin đơn hàng thành công"})
        return Response(serializer.errors, status=400)


class AllOrdersAdminView(ListAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class AdminOrderDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated] 


class VNPayPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        user = request.user
        order = get_object_or_404(Order, id=order_id, user=user, status='pending')
        for item in order.items.all():
            if item.product.seller_id == user.id:
                return Response(
                    {"error": "Đơn hàng chứa sản phẩm do bạn bán, không thể thanh toán."},
                    status=400,
                )
        amount = order.total_price
        payment_url = generate_vnpay_url(order, amount, VNPAY_CONFIG, user)
        return Response({"payment_url": payment_url})

@method_decorator(csrf_exempt, name='dispatch')
class VNPayReturnView(APIView):
    @transaction.atomic
    def get(self, request):
        print("[VNPay Callback] Đã nhận callback từ VNPay")
        params = request.query_params.dict()
        if not params:
            print("[VNPay Callback] Không nhận được tham số nào từ VNPay!")
            return Response({"message": "Không nhận được tham số callback từ VNPay"}, status=400)
        vnp_secure_hash = params.pop('vnp_SecureHash', None)
        # Sắp xếp tham số và tạo chuỗi hash
        sorted_params = sorted((k, v) for k, v in params.items() if k.startswith('vnp_'))
        hash_data = '&'.join([f"{k}={v}" for k, v in sorted_params])
        hash_secret = VNPAY_CONFIG["vnp_HashSecret"]
        secure_hash = hmac.new(hash_secret.encode('utf-8'), hash_data.encode('utf-8'), hashlib.sha512).hexdigest()
        print("[VNPay Callback] params:", params)
        print("[VNPay Callback] hash_data:", hash_data)
        print("[VNPay Callback] secure_hash:", secure_hash)
        print("[VNPay Callback] vnp_secure_hash (from VNPay):", vnp_secure_hash)
        if secure_hash == vnp_secure_hash:
            order_id = params.get('vnp_TxnRef')
            order = Order.objects.select_for_update().filter(id=order_id).first()
            if order and params.get('vnp_ResponseCode') == '00':
                if order.status == 'pending':
                    try:
                        _deduct_stock_for_order(order)
                    except ValueError as e:
                        return Response({"message": str(e)}, status=400)
                order.status = 'paid'
                order.save()
                return Response({"message": "Thanh toán thành công", "order_id": order.id})
            else:
                return Response({"message": "Thanh toán thất bại hoặc đơn hàng không tồn tại"}, status=400)
        else:
            print("[VNPay Callback] LỖI: Sai chữ ký!")
            return Response({"message": "Sai chữ ký VNPay"}, status=400) 


@method_decorator(csrf_exempt, name='dispatch')
class VNPayIPNView(APIView):
    """
    IPN: VNPay gọi server-to-server để xác nhận giao dịch.
    Trả format {RspCode, Message} để VNPay kết thúc/retry.
    """

    @transaction.atomic
    def get(self, request):
        params = request.query_params.dict()
        if not params:
            return Response({"RspCode": "99", "Message": "No params"}, status=200)

        vnp_secure_hash = params.pop('vnp_SecureHash', None)

        sorted_params = sorted((k, v) for k, v in params.items() if k.startswith('vnp_'))
        hash_data = '&'.join([f"{k}={v}" for k, v in sorted_params])
        hash_secret = VNPAY_CONFIG["vnp_HashSecret"]
        secure_hash = hmac.new(hash_secret.encode('utf-8'), hash_data.encode('utf-8'), hashlib.sha512).hexdigest()

        if not vnp_secure_hash or secure_hash != vnp_secure_hash:
            return Response({"RspCode": "97", "Message": "Invalid signature"}, status=200)

        order_id = params.get('vnp_TxnRef')
        order = Order.objects.select_for_update().filter(id=order_id).first()
        if not order:
            return Response({"RspCode": "01", "Message": "Order not found"}, status=200)

        if params.get('vnp_ResponseCode') == '00' and order.status != 'paid':
            try:
                _deduct_stock_for_order(order)
            except ValueError:
                return Response({"RspCode": "02", "Message": "Insufficient stock"}, status=200)
            order.status = 'paid'
            order.save()

        return Response({"RspCode": "00", "Message": "Confirm Success"}, status=200)

class MomoPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        user = request.user
        order = get_object_or_404(Order, id=order_id, user=user, status='pending')

        for item in order.items.all():
            if item.product.seller_id == user.id:
                return Response(
                    {"error": "Đơn hàng chứa sản phẩm do bạn bán, không thể thanh toán."},
                    status=400,
                )

        amount = int(order.total_price)
        if amount <= 0:
            return Response({"error": "Số tiền đơn hàng không hợp lệ."}, status=400)

        try:
            result = create_momo_payment(
                order_id=order.id,
                amount=amount,
                order_info=f"Thanh toan don hang {order.id}",
            )
        except Exception as e:
            print(f"[MoMo] Lỗi gọi API: {e}")
            return Response({"error": "Không thể kết nối cổng thanh toán MoMo."}, status=502)

        error_code = result.get("errorCode", -1)
        if error_code != 0:
            return Response(
                {"error": result.get("localMessage") or result.get("message", "MoMo lỗi"), "detail": result},
                status=400,
            )

        return Response({"pay_url": result.get("payUrl")})


@method_decorator(csrf_exempt, name='dispatch')
class MomoReturnView(APIView):
    """
    MoMo redirect người dùng về đây sau khi thanh toán (GET).
    Xác thực chữ ký, cập nhật đơn hàng rồi redirect về Angular.
    """

    @transaction.atomic
    def get(self, request):
        params = request.query_params.dict()
        print("[MoMo Return] params:", params)

        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:4200")

        if not verify_momo_signature(params):
            print("[MoMo Return] Sai chữ ký!")
            return HttpResponseRedirect(f"{frontend_base}/paid?momo=fail&reason=invalid_signature")

        error_code = params.get("errorCode", "-1")
        order_id = extract_django_order_id(params)

        if error_code == "0" and order_id:
            order = Order.objects.select_for_update().filter(id=order_id).first()
            if order and order.status == 'pending':
                try:
                    _deduct_stock_for_order(order)
                except ValueError:
                    return HttpResponseRedirect(f"{frontend_base}/paid?momo=fail&reason=insufficient_stock")
                order.status = 'paid'
                order.save()
                try:
                    from .utils import send_payment_email
                    send_payment_email(order.user, order)
                except Exception as e:
                    print("[MoMo] Lỗi gửi email:", e)

            return HttpResponseRedirect(f"{frontend_base}/paid?momo=success&orderId={order_id}")

        return HttpResponseRedirect(f"{frontend_base}/paid?momo=fail&errorCode={error_code}")


@method_decorator(csrf_exempt, name='dispatch')
class MomoNotifyView(APIView):
    """
    IPN: MoMo gọi server-to-server (POST) để xác nhận giao dịch.
    """

    @transaction.atomic
    def post(self, request):
        try:
            body = request.data
        except Exception:
            return Response({"message": "Invalid body"}, status=400)

        print("[MoMo Notify] body:", body)

        if not verify_momo_signature(body):
            print("[MoMo Notify] Sai chữ ký!")
            return Response({"errorCode": 1, "message": "Invalid signature"})

        error_code = str(body.get("errorCode", "-1"))
        order_id = extract_django_order_id(body)

        if error_code == "0" and order_id:
            order = Order.objects.select_for_update().filter(id=order_id).first()
            if order and order.status == 'pending':
                try:
                    _deduct_stock_for_order(order)
                except ValueError:
                    return Response({"errorCode": 2, "message": "Insufficient stock"})
                order.status = 'paid'
                order.save()

        return Response({"errorCode": 0, "message": "Success"})


# --- PHẦN DÀNH CHO SHIPPER ---

class ShipperOrderListView(generics.ListAPIView):
    """Danh sách đơn hàng 'Sẵn có' cho Shipper (Chưa có ai nhận)"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        # Chỉ lấy đơn 'paid' (đã trả tiền) và 'shipper__isnull=True' (chưa ai nhận)
        # Khi Shipper bấm nhận, status đổi hoặc shipper đã gán -> Đơn tự biến mất khỏi list này
        return Order.objects.filter(status='paid', shipper__isnull=True).order_by('-created_at')


class ShipperAcceptOrderView(APIView):
    """Bấm nút: NHẬN ĐƠN -> Chuyển sang trạng thái 'shipped'"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        # Chỉ cho nhận đơn đang ở trạng thái 'paid' và chưa có shipper
        order = get_object_or_404(Order, id=order_id, status='paid', shipper__isnull=True)
        
        order.shipper = request.user
        order.status = 'shipped'
        order.save()
        
        return Response({
            "message": "Đã nhận đơn hàng thành công", 
            "status": "shipped",
            "shipper": request.user.username
        })


class ShipperCompleteOrderView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, shipper=request.user, status='shipped')
        order.status = 'delivered'
        order.save()

        return Response({"message": "Xác nhận hoàn thành thành công"}, status=200)


class BuyerConfirmReceivedView(APIView):
    """Người mua xác nhận đã nhận hàng thành công"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user, status='delivered')
        order.status = 'confirmed_received'
        order.save()

        return Response({"message": "Xác nhận đã nhận hàng thành công"}, status=200)


class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = None

    def get_queryset(self):
        # Người dùng chỉ xem được thông báo của chính mình
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    # Thêm action để đánh dấu đã đọc khi người dùng click vào thông báo
    def perform_update(self, serializer):
        serializer.save(is_read=True)