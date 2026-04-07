import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-headeradmin',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header-admin.component.html',
  styleUrls: ['./header-admin.component.css']
})
export class HeaderAdminComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  // Badge số thông báo chưa đọc
  unreadCount = signal(0);
  // Danh sách chi tiết các thông báo
  notifications = signal<any[]>([]);

  ngOnInit(): void {
    this.loadNotifications();
    // Cập nhật lại mỗi 30s cho real-time
    setInterval(() => this.loadNotifications(), 30000);
  }

  // Lấy danh sách thông báo
  loadNotifications() {
    this.adminService.getNotifications().subscribe({
      next: (res) => {
        this.unreadCount.set(res.unread_count);
        this.notifications.set(res.items);
      },
      error: () => {
        console.log('Lỗi khi tải thông báo. Có thể server đang khởi động lại.');
      }
    });
  }

  logout() {
    // Logout về trang đăng nhập
    this.router.navigate(['/login']);
  }
}
