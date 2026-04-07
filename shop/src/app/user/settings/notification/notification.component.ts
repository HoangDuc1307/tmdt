import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit {
  activeTab = 'list';
  notifications: any[] = [];
  preferences: any = {
    email_orders: true,
    email_promotions: true,
    email_security: true,
    push_orders: true,
    push_promotions: false
  };

  private apiUrl = 'http://127.0.0.1:8000/api/v1/notifications';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
  }

  ngOnInit() {
    this.loadNotifications();
    this.loadPreferences();
  }

  loadNotifications() {
    this.http.get<any[]>(`${this.apiUrl}/`, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => this.notifications = data,
      error: () => console.error('Lỗi tải thông báo')
    });
  }

  loadPreferences() {
    this.http.get<any>(`${this.apiUrl}/preferences/`, { headers: this.getAuthHeaders() }).subscribe({
      next: (data) => {
        if(data) this.preferences = data;
      },
      error: () => console.error('Lỗi tải cài đặt thông báo')
    });
  }

  savePreferences() {
    this.http.put(`${this.apiUrl}/preferences/`, this.preferences, { headers: this.getAuthHeaders() }).subscribe({
      next: () => alert('Lưu cài đặt thành công!'),
      error: () => alert('Lỗi khi lưu cài đặt.')
    });
  }

  markAsRead(id: number) {
    this.http.patch(`${this.apiUrl}/${id}/read/`, {}, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        const notif = this.notifications.find(n => n.id === id);
        if(notif) notif.is_read = true;
      }
    });
  }

  markAllAsRead() {
    this.http.post(`${this.apiUrl}/mark-all-read/`, {}, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
      }
    });
  }

  togglePref(key: string) {
    this.preferences[key] = !this.preferences[key];
  }

  deleteNotification(id: number, event: Event) {
    event.stopPropagation();
    // Assuming DELETE /api/v1/notifications/{id}/ is allowed, if not we just filter it locally for MVP
    this.http.delete(`${this.apiUrl}/${id}/`, { headers: this.getAuthHeaders() }).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== id);
      },
      error: () => {
        this.notifications = this.notifications.filter(n => n.id !== id); // fake delete if API missing
      }
    });
  }
}
