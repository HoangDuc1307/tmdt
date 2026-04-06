import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../api/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-userupdate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './userupdate.component.html',
  styleUrls: ['./userupdate.component.css']
})
export class UserUpdateComponent implements OnInit {
  profile: any = {
    first_name: '',
    last_name: '',
    address: '',
    phone: '',
    email: '',
    image: ''
  };
  error: string = '';
  message: string = '';
  isNewProfile: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (data) => {
        this.profile = { ...this.profile, ...data };
        this.isNewProfile = false;
      },
      error: (err) => {
        // Nếu lỗi là chưa có profile thì để trống form và set isNewProfile = true
        this.isNewProfile = true;
        this.error = err.error?.detail || '';
      }
    });
  }

  onSubmit() {
    this.error = '';
    this.message = '';
    if (this.isNewProfile) {
      this.authService.createProfile(this.profile).subscribe({
        next: (res: any) => {
          this.message = 'Tạo profile thành công!';
          this.isNewProfile = false;
        },
        error: (err: any) => {
          this.error = err.error?.detail || 'Tạo profile thất bại!';
        }
      });
    } else {
      this.authService.updateProfile(this.profile).subscribe({
        next: (res: any) => {
          this.message = 'Cập nhật thành công!';
        },
        error: (err: any) => {
          this.error = err.error?.detail || 'Cập nhật thất bại!';
        }
      });
    }
  }
}