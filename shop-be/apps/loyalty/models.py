from django.db import models
from django.contrib.auth.models import User


class LoyaltyAccount(models.Model):
    TIER_CHOICES = [
        ('bronze', 'Đồng'),
        ('silver', 'Bạc'),
        ('gold', 'Vàng'),
        ('platinum', 'Bạch Kim'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='loyalty')
    points = models.IntegerField(default=0)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default='bronze')
    total_spent = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def update_tier(self):
        if self.total_spent >= 50_000_000:
            self.tier = 'platinum'
        elif self.total_spent >= 20_000_000:
            self.tier = 'gold'
        elif self.total_spent >= 5_000_000:
            self.tier = 'silver'
        else:
            self.tier = 'bronze'

    def __str__(self):
        return f"{self.user.username} - {self.tier} ({self.points} điểm)"


class PointTransaction(models.Model):
    TYPE_CHOICES = [
        ('earn', 'Tích điểm'),
        ('redeem', 'Đổi điểm'),
        ('expired', 'Hết hạn'),
        ('bonus', 'Thưởng'),
    ]

    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name='transactions')
    points = models.IntegerField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type}: {self.points} điểm - {self.account.user.username}"
