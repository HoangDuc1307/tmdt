from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ProductReview, SellerReview

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class ProductReviewSerializer(serializers.ModelSerializer):
    user_detail = UserSimpleSerializer(source='user', read_only=True)

    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'user', 'user_detail', 'rating', 'comment', 'created_at']
        extra_kwargs = {'user': {'required': False}}

    def validate_rating(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError('Điểm phải từ 1 đến 5.')
        return value

class SellerReviewSerializer(serializers.ModelSerializer):
    user_detail = UserSimpleSerializer(source='user', read_only=True)

    class Meta:
        model = SellerReview
        fields = ['id', 'seller', 'user', 'user_detail', 'rating', 'comment', 'created_at']
        extra_kwargs = {'user': {'required': False}}

    def validate_rating(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError('Điểm phải từ 1 đến 5.')
        return value
