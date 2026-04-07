import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, PaginatedResponse } from '../../services/admin.service';
import { PaginationComponent } from '../../components/pagination/pagination.component';

type ListingStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-listings-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe, PaginationComponent],
  templateUrl: './listings-approval.component.html',
  styleUrl: './listings-approval.component.css',
})
export class ListingsApprovalComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  status = signal<ListingStatus>('ALL');
  search = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  items = signal<any[]>([]);
  totalItems = signal(0);
  currentPage = signal(1);
  pageSize = 10;

  // State cho modal xem chi tiết tin đăng
  showListingModal = signal(false);
  currentListing = signal<any>(null);

  filteredItems = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((x) => (x.title ?? '').toLowerCase().includes(q));
  });

  // Vừa vào trang là fetch ngay token CSRF rồi mới load dữ liệu
  ngOnInit(): void {
    this.adminService.getCsrf().subscribe({ next: () => this.load(), error: () => this.load() });
  }

  /** Tải danh sách bài đăng từ server, có hỗ trợ phân trang và lọc status */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getListings(
      this.status() === 'ALL' ? undefined : this.status(),
      this.currentPage()
    ).subscribe({
      next: (res: PaginatedResponse<any>) => {
        this.items.set(res.results || []);
        this.totalItems.set(res.count || 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Lỗi rồi, không lấy được danh sách bài đăng.');
        this.loading.set(false);
      },
    });
  }

  // Chuyển trang (Pagination)
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  // Lọc theo trạng thái (Tất cả, Chờ duyệt, Đã duyệt, Bị từ chối)
  setStatus(s: ListingStatus): void {
    this.status.set(s);
    this.currentPage.set(1); // Reset về trang 1 cho chuẩn
    this.load();
  }

  // Phê duyệt bài đăng nhanh
  approve(id: number): void {
    if (!confirm('Bạn chắc chắn muốn duyệt bài đăng này chứ?')) return;
    this.adminService.approveListing(id).subscribe({
      next: () => {
        this.load(); // Load lại bảng để cập nhật status mới
        // Cập nhật luôn trạng thái trong modal nếu đang mở
        if (this.currentListing() && this.currentListing().id === id) {
             this.currentListing.update(l => ({...l, status: 'APPROVED'}));
        }
      },
      error: () => this.error.set('Duyệt thất bại. Hãy kiểm tra lại quyền Admin hoặc CSRF.'),
    });
  }

  // Từ chối bài đăng - bắt buộc phải nhập lý do để báo về cho Seller
  reject(id: number): void {
    const reason = window.prompt('Nhập lý do từ chối (Seller sẽ nhận được email này):', '');
    if (reason === null) return; // Bấm Cancel thì thôi không làm gì
    if (!reason.trim()) {
      alert('Không được để trống lý do từ chối!');
      return;
    }
    
    this.adminService.rejectListing(id, reason.trim()).subscribe({
      next: () => {
        this.load();
        if (this.currentListing() && this.currentListing().id === id) {
             this.currentListing.update(l => ({...l, status: 'REJECTED'}));
        }
      },
      error: () => this.error.set('Không thể từ chối bài đăng lúc này.'),
    });
  }

  // Mở modal xem thông tin chi tiết và ảnh sản phẩm
  viewListing(listing: any): void {
    this.currentListing.set(listing);
    this.showListingModal.set(true);
  }

  // Đóng modal và dọn dẹp biến tạm
  closeListingModal(): void {
    this.showListingModal.set(false);
    this.currentListing.set(null);
  }
}



