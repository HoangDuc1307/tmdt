import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-headeradmin',
  standalone: true,
  imports: [RouterModule], // <-- BẮT BUỘC PHẢI CÓ DÒNG NÀY
  templateUrl: './header-admin.component.html',
  styleUrls: ['./header-admin.component.css']
})
export class HeaderAdminComponent {
  constructor(public authService: AuthService, private router: Router) {}
  logout() {
    this.authService.logout().subscribe({
      next: (res: any) => {
        console.log('Đăng xuất thành công:', res.message);
        // Xóa local storage và chuyển hướng về trang chủ
        this.authService.clearLocalStorage();
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        console.error('Lỗi đăng xuất:', err);
        // Vẫn xóa local storage và chuyển hướng ngay cả khi có lỗi
        this.authService.clearLocalStorage();
        this.router.navigate(['/']);
      }
    });
  }
}
