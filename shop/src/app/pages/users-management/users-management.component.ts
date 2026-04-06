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
  
  // State for Block User Modal
  selectedUserForBlock = signal<any>(null);
  showBlockModal = signal(false);
  blockReasonInput = signal('Violation of platform rules');

  // Filter by search and status
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

  // Fetch CSRF token on init to ensure Block/Unblock buttons work
  ngOnInit(): void {
    this.adminService.getCsrf().subscribe({ next: () => this.load(), error: () => this.load() });
  }

  /** Fetch users list from server (paginated) */
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
        this.error.set('Something went wrong, could not fetch users list.');
        this.loading.set(false);
      },
    });
  }

  // Switch to page X
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.load();
  }

  // Show modal for admin to enter block reason
  block(u: any): void {
    this.selectedUserForBlock.set(u);
    this.showBlockModal.set(true);
  }

  // Confirm block after reason is provided
  confirmBlock(): void {
    const user = this.selectedUserForBlock();
    const reason = this.blockReasonInput();
    if (!user) return;

    this.adminService.blockUser(user.id, reason).subscribe({
      next: () => {
        this.showBlockModal.set(false);
        this.load(); // Refresh to see blocked status
      },
      error: () => this.error.set('Khóa tài khoản thất bại.'),
    });
  }

  // Unblock account immediately
  unblock(u: any): void {
    if (!confirm(`Do you want to unblock the account ${u.username}?`)) return;
    this.adminService.unblockUser(u.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to unblock account.'),
    });
  }
}
