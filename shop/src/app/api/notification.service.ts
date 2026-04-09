import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://127.0.0.1:8000/api/v1/orders/notifications/';

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    // 1. Kiểm tra chính xác tên key bạn lưu trong localStorage (access hay access_token)
    const token = localStorage.getItem('access_token') || localStorage.getItem('access');
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getNotifications(): Observable<any> {
    return this.http.get<any>(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}${id}/`, { is_read: true }, { headers: this.getAuthHeaders() });
  }
}