import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import Chart from 'chart.js/auto';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-fees-statistics',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './fees-statistics.component.html',
  styleUrl: './fees-statistics.component.css',
})
export class FeesStatisticsComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  stats = { total_revenue: 0, total_platform_fee: 0, total_transactions: 0, revenue_last_n_days: 0, platform_fee_last_n_days: 0, avg_fee_per_transaction: 0, days: 7 };
  ts = { labels: [] as string[], revenue: [] as number[], platform_fee: [] as number[] };
  topTransactions: any[] = [];
  savingReport = false;
  updatingFeeConfig = false;
  platformFeePercent = 10;
  newPlatformFeePercent = 10;
  saveMessage = '';
  chartDays = 7;
  private chart?: Chart;

  // Khởi tạo trang, load toàn bộ số liệu phí sàn
  ngOnInit(): void {
    this.load();
  }

  // Dọn dẹp biểu đồ khi rời trang
  ngOnDestroy(): void {
    this.destroyChart();
  }

  /** Tải dữ liệu từ nhiều API cùng lúc: Thống kê tổng, Data biểu đồ, Top giao dịch */
  load(): void {
    this.loading = true;
    this.saveMessage = '';

    const stats$ = this.adminService.getFeeStatistics(this.chartDays).pipe(catchError(() => of(null)));
    const feeConfig$ = this.adminService.getFeeConfig().pipe(catchError(() => of(null)));
    const ts$ = this.adminService.getDashboardTimeseries(this.chartDays).pipe(catchError(() => of(null)));
    const top$ = this.adminService.getFeeTopTransactions().pipe(catchError(() => of([])));

    // Chờ cả 3 API trả về kết quả rồi mới xử lý tiếp
    forkJoin({ stats: stats$, feeConfig: feeConfig$, ts: ts$, top: top$ }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
        queueMicrotask(() => this.renderChart()); // Vẽ lại chart sau khi đã có đủ số liệu
      })
    ).subscribe(({ stats, feeConfig, ts, top }) => {
      if (stats) {
        this.stats = { ...this.stats, ...stats };
        if (stats.platform_fee_percent !== undefined) {
          this.platformFeePercent = Number(stats.platform_fee_percent) || this.platformFeePercent;
        }
      }
      if (feeConfig?.platform_fee_percent !== undefined) {
        this.platformFeePercent = Number(feeConfig.platform_fee_percent) || this.platformFeePercent;
      }
      this.newPlatformFeePercent = this.platformFeePercent;
      if (ts) {
        this.ts = {
          labels: ts.labels ?? [],
          revenue: ts.revenue ?? [],
          platform_fee: ts.platform_fee ?? []
        };
      }
      this.topTransactions = Array.isArray(top) ? top : [];
    });
  }

  // Khi admin thay đổi filter (7/14/30 ngày)
  onChartDaysChange(): void {
    this.chartDays = Number(this.chartDays);
    this.load();
  }

  // Cấu hình biểu đồ cột (Bar Chart) hiển thị Phí sàn & Doanh thu
  private renderChart(): void {
    const canvas = document.getElementById('feeChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    this.destroyChart();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.ts.labels ?? [],
        datasets: [
          { label: 'Phí sàn', data: this.ts.platform_fee ?? [], backgroundColor: 'rgba(245, 158, 11, 0.35)', borderColor: '#f59e0b', borderWidth: 1 },
          { label: 'Doanh thu', data: this.ts.revenue ?? [], backgroundColor: 'rgba(37, 99, 235, 0.25)', borderColor: '#2563eb', borderWidth: 1 },
        ],
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { position: 'bottom' } }, 
        scales: { y: { beginAtZero: true } } 
      },
    });
  }

  private destroyChart(): void {
    if (this.chart) { this.chart.destroy(); this.chart = undefined; }
  }

  // Xuất file Excel báo cáo phí sàn
  saveReport(): void {
    if (!this.stats || !this.ts) { this.saveMessage = 'Chưa có dữ liệu để lưu.'; return; }
    this.savingReport = true;
    this.saveMessage = '';
    const days = this.chartDays || this.stats.days || 7;
    this.adminService.exportFeesReport(days).pipe(
      finalize(() => {
        this.savingReport = false;
        this.cdr.detectChanges(); // Force Angular cập nhật lại thông báo trên UI
      })
    ).subscribe({
      next: (blob: any) => {
        // Tạo link ảo để download file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fees-report-${days}-days.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.saveMessage = 'Đã tải file báo cáo phí sàn (Excel).';
      },
      error: () => {
        this.saveMessage = 'Xuất báo cáo thất bại.';
      },
    });
  }

  updatePlatformFeePercent(): void {
    const value = Number(this.newPlatformFeePercent);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      this.saveMessage = 'Mức phí sàn phải trong khoảng 0% - 100%.';
      return;
    }
    this.updatingFeeConfig = true;
    this.saveMessage = '';
    this.adminService.updateFeeConfig(value).pipe(
      finalize(() => {
        this.updatingFeeConfig = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.platformFeePercent = Number(res.platform_fee_percent) || value;
        this.newPlatformFeePercent = this.platformFeePercent;
        this.saveMessage = res.message || 'Đã cập nhật mức phí sàn.';
        this.load();
      },
      error: (err) => {
        this.saveMessage = err?.error?.detail || 'Cập nhật mức phí sàn thất bại.';
      },
    });
  }
}
