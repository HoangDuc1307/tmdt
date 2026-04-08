from decimal import Decimal

from rest_framework import serializers
from .models import Order, OrderItem,Notification

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', read_only=True, max_digits=10, decimal_places=2)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        # Đảm bảo các trường này khớp 100% với khai báo ở trên để tránh AssertionError
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'price', 'product_image']

    def get_product_image(self, obj):
        image = obj.product.image
        request = self.context.get('request')
        if not image:
            return None
        if hasattr(image, 'url'):
            if request is not None:
                return request.build_absolute_uri(image.url)
            return image.url
        image_str = str(image)
        if image_str.startswith('http'):
            return image_str
        if request is not None:
            return request.build_absolute_uri(image_str)
        return image_str

class OrderSerializer(serializers.ModelSerializer):
    user_profile = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        # Các trường này sẽ giúp hiện: Tiến Đinh, 10tr, Địa chỉ, SĐT...
        fields = [
            'id', 'status', 'total_price', 'created_at', 
            'receiver_name', 'address', 'phone', 'email', 
            'user_profile', 'items'
        ]

    def get_user_profile(self, obj):
        try:
            profile = obj.user.profile
            return {
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "address": profile.address,
                "phone": profile.phone,
                "email": profile.email,
                "image": profile.image
            }
        except:
            return None

    def get_items(self, obj):
        # Trả về danh sách sản phẩm trong đơn hàng
        return OrderItemSerializer(obj.items.all(), many=True, context=self.context).data

class OrderUpdateInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['receiver_name', 'address', 'phone', 'email']


class SellerOrderSerializer(serializers.ModelSerializer):
    """Đơn hàng nhìn từ phía seller: chỉ items thuộc sản phẩm của seller đang đăng nhập."""
    user_profile = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    seller_subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'status', 'total_price', 'seller_subtotal', 'created_at',
            'receiver_name', 'address', 'phone', 'email', 'user_profile', 'items',
        ]

    def get_user_profile(self, obj):
        try:
            profile = obj.user.profile
            return {
                'first_name': profile.first_name,
                'last_name': profile.last_name,
                'address': profile.address,
                'phone': profile.phone,
                'email': profile.email,
                'image': profile.image,
            }
        except Exception:
            return None

    def get_items(self, obj):
        seller = self.context['request'].user
        qs = obj.items.filter(product__seller=seller).select_related('product')
        return OrderItemSerializer(qs, many=True, context=self.context).data

    def get_seller_subtotal(self, obj):
        seller = self.context['request'].user
        total = Decimal('0')
        for item in obj.items.filter(product__seller=seller):
            total += item.price * item.quantity
        return total
    # ... (Giữ nguyên các code cũ của bạn bên trên)

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer để trả về danh sách thông báo cho Angular"""
    created_at_formatted = serializers.DateTimeField(source='created_at', format="%H:%M %d/%m/%Y", read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'content', 'order', 'is_read', 'created_at', 'created_at_formatted']
        read_only_fields = ['id', 'created_at']

class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Dùng riêng cho Shipper cập nhật trạng thái đơn hàng"""
    class Meta:
        model = Order
        fields = ['status']

    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.save()
        return instance
