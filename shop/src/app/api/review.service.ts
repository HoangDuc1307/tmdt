import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://127.0.0.1:8000/api/reviews';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Lấy đánh giá sản phẩm (public)
  getProductReviews(productId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/product/?product_id=${productId}`);
  }

  // Thêm đánh giá sản phẩm (cần đăng nhập)
  addProductReview(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/product/`, data, { headers });
  }

  // Lấy đánh giá người bán (public)
  getSellerReviews(sellerId: number | string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/seller/?seller_id=${sellerId}`);
  }

  // Thêm đánh giá người bán (cần đăng nhập)
  addSellerReview(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/seller/`, data, { headers });
  }
}
