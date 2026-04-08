import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShipperService {
  private baseUrl = 'http://127.0.0.1:8000/api/v1/orders/shipper';

  constructor(private http: HttpClient) {}

  // Hàm tạo Header chứa Token để không bị lỗi 401
  private getHeaders() {
    const token = localStorage.getItem('access_token'); 
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. Lấy danh sách đơn hàng sẵn có (status='paid')
  getAvailableOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/available/`, { headers: this.getHeaders() });
  }

  // 2. Nhận đơn (Chuyển từ 'paid' sang 'shipping')
  acceptOrder(orderId: number): Observable<any> {
    // URL này phải khớp với path('accept/<int:order_id>/', ...) trong urls.py
    return this.http.post(`${this.baseUrl}/accept/${orderId}/`, {}, { headers: this.getHeaders() });
  }

  // 3. Hoàn thành đơn (Chuyển từ 'shipping' sang 'completed')
  completeOrder(orderId: number): Observable<any> {
    // URL này phải khớp với path('complete/<int:order_id>/', ...) trong urls.py
    return this.http.post(`${this.baseUrl}/complete/${orderId}/`, {}, { headers: this.getHeaders() });
  }
}