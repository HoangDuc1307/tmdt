import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, PaginatedResponse } from '../../services/admin.service';
import { PaginationComponent } from '../../components/pagination/pagination.component';

type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED';

@Component({
  selector: 'app-reports-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, PaginationComponent],
  templateUrl: './reports-management.component.html',
  styleUrl: './reports-management.component.css',
})
export class ReportsManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  loading = signal(false);
  error = signal<string | null>(null);
  search = signal('');
  statusFilter = signal<ReportStatus | 'ALL'>('ALL');
  dateFrom = signal('');
  dateTo = signal('');
  reports = signal<any[]>([]);
  totalItems = signal(0);
  currentPage = signal(1);
  pageSize = 10;
  statuses: ReportStatus[] = ['PENDING', 'RESOLVED', 'REJECTED'];
  statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved (Violation)',
    REJECTED: 'Rejected (Ignored)',
  };

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const sf = this.statusFilter();
    const df = this.dateFrom();
    const dt = this.dateTo();
    return this.reports()
      .filter((r) => (sf === 'ALL' ? true : r.status === sf))
      .filter((r) => {
        if (!df && !dt) return true;
        const created = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '';
        if (df && created < df) return false;
        if (dt && created > dt) return false;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.reporter_username ?? ''} ${r.target_username ?? ''} ${r.reason ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
  });

  ngOnInit(): void {
    this.adminService.getCsrf().subscribe({ next: () => this.load(), error: () => this.load() });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getReports(this.currentPage()).subscribe({
      next: (res: PaginatedResponse<any>) => {
        this.reports.set(res.results || []);
        this.totalItems.set(res.count || 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load reports list.');
        this.loading.set(false);
      },
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  // Trạng thái cho Modal xử lý Báo cáo
  selectedReport = signal<any>(null);
  showModal = signal(false);
  replyText = signal('');
  actionChoice = signal('NONE'); // NONE, BLOCK
  newStatus = signal<ReportStatus>('PENDING');

  // Mở popup để xử lý, tiện tay reset luôn mấy cái input cũ
  openProcessModal(report: any): void {
    this.selectedReport.set(report);
    this.newStatus.set(report.status);
    this.replyText.set(report.admin_reply || '');
    this.actionChoice.set('NONE'); // Mặc định là không khóa, ai muốn khóa thì tự tích chọn
    this.showModal.set(true);
  }

  // Đóng sạch sẽ modal
  closeModal(): void {
    this.showModal.set(false);
    this.selectedReport.set(null);
  }

  /**
   * Luồng xử lý chính: Chốt báo cáo là Đúng (RESOLVED) hay Sai (REJECTED)
   */
  submitProcess(status: ReportStatus): void {
    const r = this.selectedReport();
    if (!r) return;
    
    this.loading.set(true);
    // Đẩy hết mớ record (note, trạng thái, có khóa hay không) lên server
    this.adminService.updateReportStatus(
      r.id, 
      status, 
      this.replyText(), 
      this.actionChoice()
    ).subscribe({
      next: () => {
        alert('Report processed successfully!');
        this.closeModal(); 
        this.load(); // Load lại list cho mới
      },
      error: () => {
        this.error.set('Something went wrong, could not update report.');
        this.loading.set(false);
      }
    });
  }
}
