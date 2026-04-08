import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../api/chat.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatScroll') private chatContainer!: ElementRef;
  
  isOpen: boolean = false; 
  messages: any[] = [];
  newMsg: string = '';
  
  recipientId: number = 0;
  recipientName: string = 'Người bán'; 
  
  currentUser: any = JSON.parse(localStorage.getItem('user') || '{}');
  
  private chatSub!: Subscription; 
  private toggleSub!: Subscription;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
  this.toggleSub = this.chatService.chatState$.subscribe(state => {
    if (state.open) {
      this.isOpen = true;
      // Đảm bảo gán ID để fetch tin nhắn
      this.recipientId = state.recipientId || 0; 
      
      // Gán tên từ state. Nếu state.recipientName rỗng thì mới lấy 'Người bán'
      // Lúc này state.recipientName sẽ không còn bị gạch đỏ nữa
      this.recipientName = state.recipientName || 'Người bán'; 
      
      this.fetchMessages();
    } else {
      this.isOpen = false;
    }
  });
}

  fetchMessages() {
    // Huỷ kết nối cũ trước khi tạo kết nối mới để tránh rò rỉ bộ nhớ
    if (this.chatSub) {
      this.chatSub.unsubscribe();
    }

    this.chatSub = this.chatService.getMessages(this.recipientId).subscribe({
      next: (data) => {
        const newMessages = Array.isArray(data) ? data : (data.results || []);
        // Chỉ cập nhật nếu số lượng tin nhắn thay đổi để tránh lag giao diện
        if (newMessages.length !== this.messages.length) {
          this.messages = newMessages;
        }
      },
      error: (err) => console.error('Lỗi khi tải tin nhắn:', err)
    });
  }

  send() {
    if (!this.newMsg.trim()) return;
    
    const msgContent = this.newMsg;
    this.chatService.sendMessage(this.recipientId, msgContent).subscribe({
      next: () => {
        // Push tạm thời vào mảng để người dùng thấy ngay lập tức
        this.messages.push({ 
          content: msgContent, 
          sender: this.currentUser.id, 
          created_at: new Date().toISOString() 
        });
        this.newMsg = '';
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => alert('Không thể gửi tin nhắn. Vui lòng thử lại!')
    });
  }

  closeChat() { 
    this.chatService.closeChat(); 
  }

  ngAfterViewChecked() { 
    this.scrollToBottom(); 
  }

  ngOnDestroy() { 
    if (this.chatSub) this.chatSub.unsubscribe();
    if (this.toggleSub) this.toggleSub.unsubscribe();
  }

  private scrollToBottom() {
    try { 
      if (this.chatContainer && this.chatContainer.nativeElement) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight; 
      }
    } catch (err) {}
  }
}