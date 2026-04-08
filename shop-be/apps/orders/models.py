from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from apps.products.models import Product
from django.conf import settings

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),           # Chờ thanh toán
        ('paid', 'Paid'),                 # Đã thanh toán - Hiện ở trang Shipper
        ('shipped', 'Shipped'),           # Đang đi giao
        ('delivered', 'Delivered'),       # Đã giao thành công
        ('confirmed_received', 'Confirmed Received'),  # Người mua xác nhận đã nhận
        ('cancelled', 'Cancelled'),       # Đơn bị hủy
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    # THÊM TRƯỜNG NÀY:
    shipper = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='shipping_tasks'
    )
    
    total_price = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    receiver_name = models.CharField(max_length=255, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)

    def update_total_price(self):
        total = sum(item.price * item.quantity for item in self.items.all())
        self.total_price = total
        # Chỉ save total_price mà không gọi lại hàm save() chính để tránh loop
        Order.objects.filter(pk=self.pk).update(total_price=total)

    def save(self, *args, **kwargs):
        # Chỉ set pending nếu là đơn hàng mới tạo hoàn toàn
        if not self.pk and not self.status:
            self.status = 'pending'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Đơn hàng #{self.id} - {self.status}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def clean(self):
        if self.quantity > self.product.quantity:
            raise ValidationError(f"Số lượng mua ({self.quantity}) vượt quá tồn kho ({self.product.quantity})")

    def save(self, *args, **kwargs):
        self.full_clean()
        is_new = not self.pk
        super().save(*args, **kwargs)
        
        # Cập nhật tổng tiền đơn hàng
        self.order.update_total_price()

        # Chỉ trừ kho khi tạo mới item
        if is_new:
            self.product.quantity -= self.quantity
            self.product.save()
class Notification(models.Model):
    # Người nhận thông báo (người mua hoặc người bán)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    content = models.TextField()
    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name='order_notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']