import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import Chart from 'chart.js/auto';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly adminService = inject(AdminService);
  private readonly cdr = inject(ChangeDetectorRef);

  summary = { total_users: 0, total_listings: 0, total_transactions: 0, total_revenue: 0, listings_last_n_days: 0, transactions_last_n_days: 0, days: 7 };
  loadingSummary = false;
  loadingChart = false;
  ts = { labels: [] as string[], listings_created: [] as number[], transactions_count: [] as number[] };
  savingReport = false;
  saveMessage = '';
  chartDays = 7;

  @ViewChild('growthChart', { static: false }) growthChart?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  // Vừa vào trang là load ngay số liệu tổng quan và biểu đồ
  ngOnInit(): void {
    this.loadSummary();
    this.loadChart();
  }

  // Vẽ biểu đồ sau khi giao diện đã sẵn sàng
  ngAfterViewInit(): void {
    queueMicrotask(() => this.renderChart());
  }

  // Dọn dẹp biểu đồ khi chuyển trang để tránh rò rỉ bộ nhớ
  ngOnDestroy(): void {
    this.destroyChart();
  }

  /** Lấy dữ liệu cho 6 thẻ thông số ở đầu trang */
  loadSummary(): void {
    this.loadingSummary = true;
    this.adminService.getDashboardSummary(this.chartDays).subscribe({
      next: (data) => {
        this.summary = { ...this.summary, ...data };
        this.loadingSummary = false;
        this.cdr.detectChanges(); // Ép Angular cập nhật lại UI ngay
      },
      error: () => {
        this.loadingSummary = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Lấy data để vẽ biểu đồ tăng trưởng */
  loadChart(): void {
    this.loadingChart = true;
    this.adminService.getDashboardTimeseries(this.chartDays).subscribe({
      next: (data) => {
        this.ts = { labels: data?.labels ?? [], listings_created: data?.listings_created ?? [], transactions_count: data?.transactions_count ?? [] };
        this.loadingChart = false;
        this.cdr.detectChanges();
        queueMicrotask(() => this.renderChart()); // Vẽ lại chart khi có data mới
      },
      error: () => {
        this.loadingChart = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Khi admin đổi số ngày (7/14/30) thì load lại toàn bộ
  onChartDaysChange(): void {
    this.loadSummary();
    this.loadChart();
  }

  loadAll(): void {
    this.loadSummary();
    this.loadChart();
  }

  // Khởi tạo và cấu hình biểu đồ Chart.js
  private renderChart(): void {
    if (!this.growthChart?.nativeElement) return;
    this.destroyChart(); // Xóa cái cũ đi trước khi vẽ cái mới
    const ctx = this.growthChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.ts.labels ?? [],
        datasets: [
          {
            label: 'Bài đăng mới',
            data: this.ts.listings_created ?? [],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            tension: 0.25,
          },
          {
            label: 'Giao dịch',
            data: this.ts.transactions_count ?? [],
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }, // Đẩy chú thích xuống dưới cho thoáng
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  // Xuất báo cáo ra file Excel và tự động tải về máy
  saveReport(): void {
    if (!this.summary || !this.ts) {
      this.saveMessage = 'Chưa có dữ liệu để lưu.';
      return;
    }
    this.savingReport = true;
    this.saveMessage = '';
    const days = this.chartDays || this.summary.days || 7;
    this.adminService.exportDashboardReport(days).pipe(
      finalize(() => {
        this.savingReport = false;
        this.cdr.detectChanges(); 
      })
    ).subscribe({
      next: (blob: any) => {
        // Tạo link ảo để trình duyệt tự kích hoạt tải file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-report-${days}-days.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.saveMessage = 'Đã tải file báo cáo (Excel).';
      },
      error: () => {
        this.saveMessage = 'Xuất báo cáo thất bại (kiểm tra đăng nhập admin).';
      },
    });
  }
}
