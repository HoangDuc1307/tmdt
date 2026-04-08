from rest_framework import serializers
from .models import Message
from django.contrib.auth.models import User

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.username')
    receiver_name = serializers.ReadOnlyField(source='receiver.username') # Thêm tên người nhận cho dễ quản lý

    class Meta:
        model = Message
        fields = [
            'id', 
            'sender', 'sender_name', 
            'receiver', 'receiver_name', 
            'content', 
            'image',    # QUAN TRỌNG: Để gửi ảnh thực tế
            'is_read',  # QUAN TRỌNG: Để làm tin nhắn chờ
            'timestamp'
        ]
        read_only_fields = ['id', 'sender', 'timestamp', 'is_read']

    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None