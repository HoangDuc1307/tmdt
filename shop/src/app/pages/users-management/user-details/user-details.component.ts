import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.css'
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);

  userId = signal<number | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  data = signal<any>(null);
  
  // Logic cho Modal Khóa tài khoản tại trang chi tiết
  showBlockModal = signal(false);
  blockReasonInput = signal('Violation of platform rules');

  statusLabels: Record<string, string> = {
    OPEN: 'New',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected',
    APPROVED: 'Approved',
    PENDING: 'Pending',
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userId.set(+id);
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getUserActivity(this.userId()!).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load user activity details.');
        this.loading.set(false);
      }
    });
  }

  // Xử lý nút Khóa/Mở khóa
  toggleBlock(): void {
    const user = this.data().user;
    const isBlocked = user.is_blocked;
    
    if (!isBlocked) {
      // Hiện Modal để nhập lý do
      this.showBlockModal.set(true);
    } else {
      if (!confirm(`Are you sure you want to unblock this account?`)) return;
      this.adminService.unblockUser(user.id).subscribe(() => {
        alert('Account unblocked successfully!');
        this.load();
      });
    }
  }

  // Xác nhận khóa vĩnh viễn từ Modal
  confirmBlock(): void {
    const user = this.data().user;
    const reason = this.blockReasonInput();
    
    this.adminService.blockUser(user.id, reason).subscribe(() => {
      alert('Account blocked successfully!');
      this.showBlockModal.set(false);
      this.load();
    });
  }
}
