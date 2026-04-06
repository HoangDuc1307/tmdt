import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  // Fetch CSRF token for write operations (POST/PUT/DELETE)
  getCsrf(): Observable<any> {
    return this.http.get(`${this.baseUrl}/csrf/`, { withCredentials: true });
  }

  // Get 6 summary cards for Dashboard
  getDashboardSummary(days = 7): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/summary/`, {
      params: { days },
      withCredentials: true,
    });
  }

  // Get all dashboard data (summary + timeseries)
  getDashboardData(days = 7): Observable<{ summary: any; timeseries: any }> {
    return this.http.get<{ summary: any; timeseries: any }>(`${this.baseUrl}/dashboard/`, {
      params: { days },
      withCredentials: true,
    });
  }

  // Get only charts data
  getDashboardTimeseries(days = 7): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/timeseries/`, {
      params: { days },
      withCredentials: true,
    });
  }

  // Download Dashboard report (Excel)
  exportDashboardReport(days = 7): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/dashboard/export-report/`, {
      params: { days },
      withCredentials: true,
      responseType: 'blob'
    });
  }

  // Get listings with pagination and status filtering
  getListings(status?: string, page: number = 1): Observable<PaginatedResponse<any>> {
    const params: any = { page };
    if (status) params.status = status;
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/listings/`, {
      params,
      withCredentials: true,
    });
  }

  // Approve user listing
  approveListing(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/listings/${id}/approve/`, null, {
      withCredentials: true,
    });
  }

  // View price history of an item
  getPriceHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/listings/${id}/price-history/`, {
      withCredentials: true,
    });
  }

  // Reject listing with reason
  rejectListing(id: number, reason: string = 'No specific reason'): Observable<any> {
    return this.http.post(`${this.baseUrl}/listings/${id}/reject/`, { reason }, {
      withCredentials: true,
    });
  }

  // List users (paginated)
  getUsers(page: number = 1): Observable<PaginatedResponse<any>> {
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/users/`, {
      params: { page },
      withCredentials: true,
    });
  }

  // Block account with violation reason
  blockUser(id: number, reason: string = ''): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${id}/block/`, { reason }, {
      withCredentials: true,
    });
  }

  // Unblock user account
  unblockUser(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${id}/unblock/`, null, {
      withCredentials: true,
    });
  }

  // View recent user activity (buy/sell/topup)
  getUserActivity(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/${id}/activity/`, {
      withCredentials: true,
    });
  }

  // List violation reports
  getReports(page: number = 1): Observable<PaginatedResponse<any>> {
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/reports/`, {
      params: { page },
      withCredentials: true,
    });
  }

  // Resolve report (Reply, Status change, optional Block)
  updateReportStatus(id: number, status: string, admin_reply?: string, action?: string): Observable<any> {
    const payload: any = { status };
    if (admin_reply !== undefined) payload.admin_reply = admin_reply;
    if (action !== undefined) payload.action = action;

    return this.http.post(
      `${this.baseUrl}/reports/${id}/resolve/`,
      payload,
      { withCredentials: true },
    );
  }

  // Platform fee and revenue statistics
  getFeeStatistics(days = 7): Observable<any> {
    return this.http.get(`${this.baseUrl}/fees/statistics/`, {
      params: { days },
      withCredentials: true,
    });
  }

  // View top fee contributors
  getFeeTopTransactions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/fees/top-transactions/`, {
      withCredentials: true,
    });
  }

  // Save Dashboard snapshot
  saveDashboardReport(summary: any, timeseries: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/dashboard/save-report/`,
      { summary, timeseries },
      { withCredentials: true },
    );
  }

  // Save Fees report snapshot
  saveFeesReport(stats: any, timeseries: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/fees/save-report/`,
      { stats, timeseries },
      { withCredentials: true },
    );
  }

  // Download Fees report (Excel)
  exportFeesReport(days = 7): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/fees/export-report/`, {
      params: { days },
      withCredentials: true,
      responseType: 'blob',
    });
  }

  // Get Admin audit logs
  getAuditLogs(actionParam?: string, page: number = 1): Observable<PaginatedResponse<any>> {
    const params: any = { page };
    if (actionParam && actionParam !== 'ALL') {
      params.action = actionParam;
    }
    return this.http.get<PaginatedResponse<any>>(`${this.baseUrl}/logs/`, {
      params,
      withCredentials: true,
    });
  }

  // Get notification bell data for Header
  getNotifications(): Observable<{ unread_count: number; items: any[] }> {
    return this.http.get<{ unread_count: number; items: any[] }>(`${this.baseUrl}/dashboard/notifications/`, {
      withCredentials: true,
    });
  }
}
