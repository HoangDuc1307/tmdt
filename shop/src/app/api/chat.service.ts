import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timer, BehaviorSubject } from 'rxjs';
import { switchMap, shareReplay, map } from 'rxjs/operators';

interface ChatState {
  open: boolean;
  recipientId: number | null;
  recipientName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = 'http://127.0.0.1:8000/api/v1/chat/messages/'; 

  private chatToggle = new BehaviorSubject<ChatState>({
    open: false, 
    recipientId: null,
    recipientName: ''
  });
  
  chatState$ = this.chatToggle.asObservable();

  constructor(private http: HttpClient) {}

  triggerChat(recipientId: number, recipientName: string) {
    this.chatToggle.next({ 
      open: true, 
      recipientId: recipientId, 
      recipientName: recipientName 
    });
  }

  closeChat() {
    this.chatToggle.next({ 
      open: false, 
      recipientId: null, 
      recipientName: '' 
    });
  }

  private getHeaders(isUpload: boolean = false) {
    const token = localStorage.getItem('access'); 
    let headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    // Nếu gửi ảnh (FormData), trình duyệt sẽ tự tạo Content-Type phù hợp, không được để application/json
    if (!isUpload) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  // --- 1. LẤY TIN NHẮN CHỜ (Để hiện số đỏ trên Icon và Popup) ---
  getUnreadRequests(): Observable<any[]> {
    return timer(0, 5000).pipe( // Cứ 5 giây kiểm tra tin nhắn mới một lần
      switchMap(() => 
        this.http.get<any[]>(`${this.baseUrl}unread_requests/`, { 
          headers: this.getHeaders() 
        })
      ),
      shareReplay(1)
    );
  }

  getMessages(recipientId: number): Observable<any> {
    return timer(0, 3000).pipe(
      switchMap(() => 
        this.http.get(`${this.baseUrl}?recipient_id=${recipientId}`, { 
          headers: this.getHeaders() 
        })
      ),
      shareReplay(1) 
    );
  }

  // --- 2. GỬI TIN NHẮN (Hỗ trợ cả chữ và ảnh thực tế) ---
  sendMessage(recipientId: number, content: string, imageFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('receiver', recipientId.toString());
    
    if (content) {
      formData.append('content', content);
    }
    if (imageFile) {
      formData.append('image', imageFile); // Đẩy file ảnh vào đây
    }

    return this.http.post(this.baseUrl, formData, { 
      headers: this.getHeaders(true) // true để báo là đang upload file
    });
  }

  // --- 3. ĐÁNH DẤU ĐÃ ĐỌC ---
  markAsRead(senderId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}mark_as_read/`, { sender_id: senderId }, {
      headers: this.getHeaders()
    });
  }
}