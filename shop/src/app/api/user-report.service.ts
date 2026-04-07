import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserReportService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/v1';

  constructor(private http: HttpClient) {}

  /** Gửi báo cáo người dùng (cùng UserReport với admin). Có thể kèm tối đa 5 ảnh. */
  submitUserReport(
    payload: {
      target_user_id: number;
      reason: string;
      category: string;
      product_id?: number | null;
    },
    imageFiles: File[] = []
  ): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    const fd = new FormData();
    fd.append('target_user_id', String(payload.target_user_id));
    fd.append('reason', payload.reason);
    fd.append('category', payload.category);
    if (payload.product_id != null && payload.product_id !== undefined) {
      fd.append('product_id', String(payload.product_id));
    }
    for (const file of imageFiles.slice(0, 5)) {
      fd.append('images', file, file.name);
    }
    return this.http.post(`${this.apiUrl}/reports/user/`, fd, { headers });
  }
}
