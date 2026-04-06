import { Component } from '@angular/core';
import { HeaderComponent } from '../../component/header/header.component';
import { FooterComponent } from '../../component/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../api/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [HeaderComponent, FooterComponent, FormsModule, CommonModule]
})
export class LoginComponent {
  username = '';
  password = '';
  message = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.message = '';
    this.error = '';
    
    this.authService.login({ username: this.username, password: this.password })
      .subscribe({
        next: (res) => { 
          this.message = res.message; 
          
          // Hiển thị tokens trong console
          console.log('Access Token:', res.access);
          console.log('Refresh Token:', res.refresh);
          console.log('User info:', res.user);
          
          // Lưu JWT tokens và thông tin user vào localStorage
          this.authService.saveTokens(res.access, res.refresh, res.user);

          // Điều hướng dựa trên quyền admin
          if (res.user && res.user.is_staff === true) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err) => { 
          this.error = err.error?.error || 'Đăng nhập thất bại'; 
        }
      });
  }

  // Xử lý đăng ký
  onRegister() {
    // Chuyển hướng sang trang đăng ký
    this.router.navigate(['/register']);
  }
}