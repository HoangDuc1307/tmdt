import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, PaginatedResponse } from '../../services/admin.service';
import { PaginationComponent } from '../../components/pagination/pagination.component';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.css',
})
export class UsersManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  loading = signal(false);
  error = signal<string | null>(null);
  search = signal('');
  statusFilter = signal<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  users = signal<any[]>([]);
  totalItems = signal(0);
  currentPage = signal(1);
  pageSize = 10;
  
  // Trạng thái cho Modal Khóa tài khoản
  selectedUserForBlock = signal<any>(null);
  showBlockModal = signal(false);
  blockReasonInput = signal('Vi phạm quy định sàn');

  // Filter lọc theo search và status
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const sf = this.statusFilter();
    return this.users()
      .filter((u) => (sf === 'ALL' ? true : sf === 'ACTIVE' ? u.is_active : !u.is_active))
      .filter((u) => {
        if (!q) return true;
        const hay = `${u.username ?? ''} ${u.email ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
  });

  // Vừa vào trang là lấy ngay CSRF để đảm bảo các nút Khóa/Mở khóa hoạt động được
  ngOnInit(): void {
    this.adminService.getCsrf().subscribe({ next: () => this.load(), error: () => this.load() });
  }

  /** Lấy danh sách người dùng từ server (phân trang) */
  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getUsers(this.currentPage()).subscribe({
      next: (res: PaginatedResponse<any>) => {
        this.users.set(res.results || []);
        this.totalItems.set(res.count || 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Lỗi rồi, không lấy được danh sách người dùng.');
        this.loading.set(false);
      },
    });
  }

  // Chuyển sang trang X
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  // Hiện modal để admin nhập lý do khóa tài khoản
  block(u: any): void {
    this.selectedUserForBlock.set(u);
    this.showBlockModal.set(true);
  }

  // Xác nhận khóa sau khi đã có lý do cụ thể
  confirmBlock(): void {
    const user = this.selectedUserForBlock();
    const reason = this.blockReasonInput();
    if (!user) return;

    this.adminService.blockUser(user.id, reason).subscribe({
      next: () => {
        this.showBlockModal.set(false);
        this.load(); // Load lại để thấy status đã bị khóa
      },
      error: () => this.error.set('Khóa tài khoản thất bại.'),
    });
  }

  // Mở khóa tài khoản ngay lập tức
  unblock(u: any): void {
    if (!confirm(`Bạn muốn mở khóa cho tài khoản ${u.username}?`)) return;
    this.adminService.unblockUser(u.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Mở khóa thất bại.'),
    });
  }
}
