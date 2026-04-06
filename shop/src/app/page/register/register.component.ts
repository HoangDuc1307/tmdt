import { Component } from '@angular/core';
import { HeaderComponent } from '../../component/header/header.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../api/auth.service';
import { CommonModule } from '@angular/common';
import { FooterComponent } from "../../component/footer/footer.component";
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [HeaderComponent, FormsModule, CommonModule, FooterComponent]
})
export class RegisterComponent {
  email = '';
  password = '';
  username = '';
  message = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.message = '';
    this.error = '';
    this.authService.register({ email: this.email, password: this.password, username: this.username })
      .subscribe({
        next: (res) => { 
          this.message = res.message; 
          
          // Hiển thị thông báo thành công trong 2 giây rồi chuyển hướng
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => { 
          this.error = err.error?.error || 'Đăng ký thất bại'; 
        }
      });
  }
} 