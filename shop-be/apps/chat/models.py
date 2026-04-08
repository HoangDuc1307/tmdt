from django.db import models
from django.contrib.auth.models import User

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(blank=True, null=True) # Để null vì đôi khi người ta chỉ gửi ảnh, không gửi chữ
    
    # --- THÊM 2 DÒNG DƯỚI ĐÂY ---
    image = models.ImageField(upload_to='chat_images/', blank=True, null=True) # Lưu hình ảnh
    is_read = models.BooleanField(default=False) # Để biết tin nhắn nào là "chờ" (chưa đọc)
    # ----------------------------

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp'] # Sắp xếp tin nhắn theo thời gian tăng dần

    def __str__(self):
        # Nếu có ảnh mà không có chữ thì hiện thông báo [Image]
        display_content = self.content[:20] if self.content else "[Hình ảnh]"
        return f'{self.sender.username} to {self.receiver.username}: {display_content}'