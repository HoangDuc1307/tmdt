from django.db import models
from django.contrib.auth.models import User


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    order_updates = models.BooleanField(default=True)
    promotions = models.BooleanField(default=True)
    new_messages = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=False)

    def __str__(self):
        return f"Cài đặt thông báo của {self.user.username}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('order', 'Đơn hàng'),
        ('promo', 'Khuyến mãi'),
        ('message', 'Tin nhắn'),
        ('security', 'Bảo mật'),
        ('loyalty', 'Điểm thưởng'),
        ('system', 'Hệ thống'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.username}"
