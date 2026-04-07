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
import hmac
import hashlib
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .utils import send_payment_email

# Đơn hàng "đã mua" (đã thanh toán hoặc đang/đã giao) — không hiển thị pending ở list/detail buyer
PURCHASED_ORDER_STATUSES = ('paid', 'shipped', 'delivered')


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

    def post(self, request, order_id):
        user = request.user
        order = get_object_or_404(Order, id=order_id, user=user)

        if order.status != 'pending':
            return Response({"error": "Đơn hàng đã thanh toán hoặc không hợp lệ"}, status=400)

        for item in order.items.all():
            if item.product.seller_id == user.id:
                return Response(
                    {"error": "Đơn hàng chứa sản phẩm do bạn bán, không thể thanh toán."},
                    status=400,
                )

        # Kiểm tra tồn kho trước khi trừ
        for item in order.items.all():
            product = item.product
            if item.quantity > product.quantity:
                return Response({"error": f"Sản phẩm '{product.name}' đã hết hàng hoặc không đủ số lượng"}, status=400)

        # Nếu đủ hàng, mới trừ tồn kho
        for item in order.items.all():
            product = item.product
            product.quantity -= item.quantity
            product.save()

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
            order = Order.objects.filter(id=order_id).first()
            if order and params.get('vnp_ResponseCode') == '00':
                order.status = 'paid'
                order.save()
                return Response({"message": "Thanh toán thành công", "order_id": order.id})
            else:
                return Response({"message": "Thanh toán thất bại hoặc đơn hàng không tồn tại"}, status=400)
        else:
            print("[VNPay Callback] LỖI: Sai chữ ký!")
            return Response({"message": "Sai chữ ký VNPay"}, status=400) 

