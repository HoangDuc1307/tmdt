from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'Nam'),
        ('female', 'Nữ'),
        ('other', 'Khác'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    address = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField()
    image = models.URLField(null=True, blank=True)
    bio = models.TextField(blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    language_preference = models.CharField(max_length=10, default='vi')

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.user.username})"