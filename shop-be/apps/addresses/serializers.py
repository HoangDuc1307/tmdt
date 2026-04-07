from rest_framework import serializers
from .models import Address


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'full_name', 'phone', 'address_line',
            'ward', 'district', 'province', 'is_default', 'lat', 'lng', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
