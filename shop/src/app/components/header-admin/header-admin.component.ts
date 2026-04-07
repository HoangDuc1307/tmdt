import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../api/auth.service';
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
  private readonly authService = inject(AuthService);

  // Unread notification badge count
  unreadCount = signal(0);
  // Detailed list of notifications
  notifications = signal<any[]>([]);

  // Dark Mode management
  currentTheme = signal('dark');

  ngOnInit(): void {
    this.loadNotifications();
    // Refresh every 30s for real-time updates
    setInterval(() => this.loadNotifications(), 30000);

    // Bootstrap 5 dark mode init
    const savedTheme = localStorage.getItem('theme') || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme: string) {
    this.currentTheme.set(theme);
    localStorage.setItem('theme', theme);

    // Apply the theme to html tag
    if (theme === 'auto') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-bs-theme', isSystemDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme);
    }
  }

  // Fetch notifications list
  loadNotifications() {
    this.adminService.getNotifications().subscribe({
      next: (res) => {
        this.unreadCount.set(res.unread_count);
        this.notifications.set(res.items);
      },
      error: () => {
        console.log('Error loading notifications. Server might be restarting.');
      }
    });
  }

  logout() {
    // Xóa ngay dữ liệu cục bộ
    this.authService.clearLocalStorage();
    
    // Gọi API logout chạy ngầm
    this.authService.logout().subscribe({
      next: () => console.log('Admin logout success'),
      error: () => console.error('Admin logout error')
    });

    // Reset hoàn toàn và quay về trang chủ
    window.location.href = '/';
  }
}
