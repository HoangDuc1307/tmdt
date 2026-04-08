from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Message
from .serializers import MessageSerializer
from django.db.models import Q, Max

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.AllowAny] # Giữ nguyên để bạn test, sau này nhớ đổi lại

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Message.objects.none()
            
        recipient_id = self.request.query_params.get('recipient_id')
        
        if recipient_id:
            # Khi lấy lịch sử chat cụ thể, tự động đánh dấu các tin nhắn gửi ĐẾN mình là ĐÃ ĐỌC
            Message.objects.filter(sender_id=recipient_id, receiver=user, is_read=False).update(is_read=True)
            
            return Message.objects.filter(
                (Q(sender=user) & Q(receiver_id=recipient_id)) |
                (Q(sender_id=recipient_id) & Q(receiver=user))
            ).order_by('timestamp')
            
        return Message.objects.filter(Q(sender=user) | Q(receiver=user)).order_by('timestamp')

    def perform_create(self, serializer):
        # Lưu tin nhắn, hỗ trợ cả content (chữ) và image (ảnh)
        serializer.save(sender=self.request.user)

    # --- ACTION MỚI: LẤY DANH SÁCH TIN NHẮN CHỜ (MESSENGER STYLE) ---
    @action(detail=False, methods=['get'])
    def unread_requests(self):
        user = self.request.user
        if not user.is_authenticated:
            return Response([])

        # Tìm những người đã gửi tin nhắn cho tôi mà tôi chưa đọc
        # Lấy tin nhắn mới nhất từ mỗi người gửi
        unread_messages = Message.objects.filter(receiver=user, is_read=False)\
            .values('sender')\
            .annotate(last_msg_id=Max('id'))\
            .order_by('-last_msg_id')

        results = []
        for item in unread_messages:
            msg = Message.objects.get(id=item['last_msg_id'])
            results.append({
                'sender_id': msg.sender.id,
                'sender_name': msg.sender.username,
                'content': msg.content if msg.content else "[Hình ảnh]",
                'timestamp': msg.timestamp,
                'is_read': msg.is_read
            })
        
        return Response(results)

    # --- ACTION MỚI: ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ ---
    @action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        sender_id = request.data.get('sender_id')
        if sender_id:
            Message.objects.filter(sender_id=sender_id, receiver=request.user).update(is_read=True)
            return Response({'status': 'marked as read'})
        return Response({'error': 'sender_id required'}, status=status.HTTP_400_BAD_REQUEST)