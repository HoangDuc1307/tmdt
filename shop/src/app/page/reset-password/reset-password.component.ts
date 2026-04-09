import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ResetPasswordComponent implements OnInit {
  email = '';
  newPassword = '';
  confirmPassword = '';
  uid = '';
  token = '';

  message = '';
  error = '';
  isSubmitting = false;
  isResetMode = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.uid = this.route.snapshot.queryParamMap.get('uid') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.isResetMode = !!(this.uid && this.token);
  }

  onSendResetLink() {
    this.message = '';
    this.error = '';
    if (!this.email) {
      this.error = 'Vui lòng nhập email.';
      return;
    }

    this.isSubmitting = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.message = res?.message || 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.';
        this.isSubmitting = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Không thể gửi yêu cầu. Vui lòng thử lại.';
        this.isSubmitting = false;
      }
    });
  }

  onResetPassword() {
    this.message = '';
    this.error = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.error = 'Vui lòng nhập đầy đủ mật khẩu.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    this.isSubmitting = true;
    this.authService.resetPassword({
      uid: this.uid,
      token: this.token,
      new_password: this.newPassword,
      confirm_password: this.confirmPassword
    }).subscribe({
      next: (res) => {
        this.message = res?.message || 'Đặt lại mật khẩu thành công.';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Link reset không hợp lệ hoặc đã hết hạn.';
        this.isSubmitting = false;
      }
    });
  }
}
