import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly getAuthHeaders = (): HttpHeaders => {
    const token = localStorage.getItem('access_token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  };

  private readonly withAuth = (params?: Record<string, any>) => ({
    headers: this.getAuthHeaders(),
    params,
  });

  // Lấy token CSRF để được phép gọi các API write (POST/PUT/DELETE)
  getCsrf(): Observable<any> {
    return this.http.get(`${this.baseUrl}/csrf/`, this.withAuth());
  }

  // Lấy số liệu 6 thẻ summary ở Dashboard
  getDashboardSummary(days = 7): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary/`, this.withAuth({ days }));
  }

  // Lấy tất tần tật data dashboard (cả summary và biểu đồ) cho nhanh
  getDashboardData(days = 7): Observable<{ summary: any; timeseries: any }> {
    return this.http.get<{ summary: any; timeseries: any }>(`${this.baseUrl}/dashboard/`, this.withAuth({ days }));
  }

  // Chỉ lấy data để vẽ biểu đồ
  getDashboardTimeseries(days = 7): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/timeseries/`, this.withAuth({ days }));
  }

  // Tải file Excel báo cáo Dashboard về máy
  exportDashboardReport(days = 7): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/dashboard/export-report/`, {
      ...this.withAuth({ days }),
      responseType: 'blob'
    });
  }

  // Lấy danh sách bài đăng, có hỗ trợ phân trang và lọc theo trạng thái
  getListings(status?: string, page: number = 1): Observable<PaginatedResponse<any>> {
    const params: any = { page };
    if (status) params.status = status;
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/listings/`, this.withAuth(params));
  }

  // Duyệt bài cho người dùng
  approveListing(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/listings/${id}/approve/`, null, this.withAuth());
  }

  // Xem lịch sử giá của một món hàng
  getPriceHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/listings/${id}/price-history/`, this.withAuth());
  }

  // Từ chối bài đăng (phải kèm lý do)
  rejectListing(id: number, reason: string = 'Không có lý do cụ thể'): Observable<any> {
    return this.http.post(`${this.baseUrl}/listings/${id}/reject/`, { reason }, this.withAuth());
  }

  // Danh sách người dùng (phân trang)
  getUsers(page: number = 1): Observable<PaginatedResponse<any>> {
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/users/`, this.withAuth({ page }));
  }

  // Khóa tài khoản kèm lý do vi phạm
  blockUser(id: number, reason: string = ''): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${id}/block/`, { reason }, this.withAuth());
  }

  // Mở khóa cho người dùng
  unblockUser(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${id}/unblock/`, null, this.withAuth());
  }

  // Xem các hoạt động gần đây của user (mua/bán/nạp tiền)
  getUserActivity(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/${id}/activity/`, this.withAuth());
  }

  // Danh sách các báo cáo/tố cáo vi phạm
  getReports(page: number = 1): Observable<PaginatedResponse<any>> {
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/reports/`, this.withAuth({ page }));
  }

  // Chốt kết quả xử lý báo cáo (Phản hồi, Đổi trạng thái, Khóa user nếu cần)
  updateReportStatus(id: number, status: string, admin_reply?: string, action?: string): Observable<any> {
    const payload: any = { status };
    if (admin_reply !== undefined) payload.admin_reply = admin_reply;
    if (action !== undefined) payload.action = action;

    return this.http.post(
      `${this.baseUrl}/reports/${id}/resolve/`,
      payload,
      this.withAuth(),
    );
  }

  // Thống kê doanh thu và phí sàn
  getFeeStatistics(days = 7): Observable<any> {
    return this.http.get(`${this.baseUrl}/fees/statistics/`, this.withAuth({ days }));
  }

  // Xem ai là người đóng góp phí sàn nhiều nhất
  getFeeTopTransactions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/fees/top-transactions/`, this.withAuth());
  }

  // Lưu snapshot Dashboard lại
  saveDashboardReport(summary: any, timeseries: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/dashboard/save-report/`,
      { summary, timeseries },
      this.withAuth(),
    );
  }

  // Lưu snapshot báo cáo Phí sàn
  saveFeesReport(stats: any, timeseries: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/fees/save-report/`,
      { stats, timeseries },
      this.withAuth(),
    );
  }

  // Tải file Excel báo cáo Phí sàn
  exportFeesReport(days = 7): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/fees/export-report/`, {
      ...this.withAuth({ days }),
      responseType: 'blob',
    });
  }

  // Lấy nhật ký thao tác của Admin
  getAuditLogs(actionParam?: string, page: number = 1): Observable<PaginatedResponse<any>> {
    const params: any = { page };
    if (actionParam && actionParam !== 'ALL') {
      params.action = actionParam;
    }
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/logs/`, this.withAuth(params));
  }

  // Lấy dữ liệu cho chuông thông báo ở Header
  getNotifications(): Observable<{ unread_count: number; items: any[] }> {
    return this.http.get<{ unread_count: number; items: any[] }>(`${this.baseUrl}/dashboard/notifications/`, this.withAuth());
  }
}
