import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../component/header-admin/header-admin.component';

interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'waiting';
  lastMessage?: string;
  lastActive: Date;
  unreadCount: number;
}

interface Message {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chatmanage',
  templateUrl: './chatmanage.component.html',
  styleUrls: ['./chatmanage.component.css'],
  standalone: true,
  imports: [RouterOutlet, FormsModule, RouterModule, CommonModule, SidebarComponent, HeaderAdminComponent],
})
export class ChatManageComponent implements OnInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  searchTerm: string = '';
  currentFilter: string = 'all';
  selectedUser: User | null = null;
  newMessage: string = '';

  // Mock data - thay thế bằng dữ liệu thực từ service
  users: User[] = [
    {
      id: '1',
      name: 'Nguyễn Văn A',
      status: 'online',
      lastMessage: 'Xin chào, tôi cần hỗ trợ về sản phẩm',
      lastActive: new Date(),
      unreadCount: 2
    },
    {
      id: '2',
      name: 'Trần Thị B',
      status: 'waiting',
      lastMessage: 'Tôi muốn đổi trả sản phẩm',
      lastActive: new Date(Date.now() - 300000),
      unreadCount: 1
    },
    {
      id: '3',
      name: 'Lê Văn C',
      status: 'offline',
      lastMessage: 'Cảm ơn bạn đã hỗ trợ',
      lastActive: new Date(Date.now() - 3600000),
      unreadCount: 0
    },
    {
      id: '4',
      name: 'Phạm Thị D',
      status: 'online',
      lastMessage: 'Sản phẩm có bảo hành không?',
      lastActive: new Date(Date.now() - 120000),
      unreadCount: 3
    },
    {
      id: '5',
      name: 'Hoàng Văn E',
      status: 'waiting',
      lastMessage: 'Tôi cần gặp admin',
      lastActive: new Date(Date.now() - 600000),
      unreadCount: 5
    }
  ];

  messages: Message[] = [];

  ngOnInit() {
    // Khởi tạo dữ liệu
  }

  get filteredUsers(): User[] {
    let filtered = this.users;

    // Lọc theo search term
    if (this.searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Lọc theo status
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(user => user.status === this.currentFilter);
    }

    return filtered;
  }

  setFilter(filter: string) {
    this.currentFilter = filter;
  }

  selectUser(user: User) {
    this.selectedUser = user;
    // Reset unread count
    user.unreadCount = 0;
    // Load messages for this user
    this.loadMessages(user.id);
  }

  loadMessages(userId: string) {
    // Mock messages - thay thế bằng dữ liệu thực từ service
    this.messages = [
      {
        id: '1',
        sender: 'user',
        text: 'Xin chào, tôi cần hỗ trợ về sản phẩm',
        timestamp: new Date(Date.now() - 600000)
      },
      {
        id: '2',
        sender: 'admin',
        text: 'Chào bạn! Tôi có thể giúp gì cho bạn?',
        timestamp: new Date(Date.now() - 580000)
      },
      {
        id: '3',
        sender: 'user',
        text: 'Tôi muốn biết thông tin về sản phẩm XYZ',
        timestamp: new Date(Date.now() - 560000)
      }
    ];
    
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedUser) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: 'admin',
      text: this.newMessage.trim(),
      timestamp: new Date()
    };

    this.messages.push(message);
    this.newMessage = '';
    
    setTimeout(() => this.scrollToBottom(), 100);
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'online': return 'Đang online';
      case 'offline': return 'Offline';
      case 'waiting': return 'Chờ hỗ trợ';
      default: return 'Không xác định';
    }
  }
}