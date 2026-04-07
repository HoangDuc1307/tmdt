import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../api/translate.pipe';
import { AuthService } from '../../../api/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  basicForm!: FormGroup;
  contactForm!: FormGroup;
  passwordForm!: FormGroup;
  
  loadingBasic = false;
  loadingContact = false;
  loadingPassword = false;

  messageBasic = '';
  messageContact = '';
  messagePassword = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.basicForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      bio: [''],
      date_of_birth: [''],
      gender: ['']
    });

    this.contactForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['']
    });

    this.passwordForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.authService.getProfile().subscribe(profile => {
      this.basicForm.patchValue({
        first_name: profile.first_name,
        last_name: profile.last_name,
        bio: profile.bio || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || ''
      });
      this.contactForm.patchValue({
        email: profile.email,
        phone: profile.phone || ''
      });
    });
  }

  saveBasicInfo() {
    if (this.basicForm.invalid) return;
    this.loadingBasic = true;
    this.authService.updateProfile(this.basicForm.value).subscribe({
      next: () => {
        this.messageBasic = 'Cập nhật thành công!';
        this.loadingBasic = false;
        setTimeout(() => this.messageBasic = '', 3000);
      },
      error: () => {
        this.loadingBasic = false;
      }
    });
  }

  saveContactInfo() {
    if (this.contactForm.invalid) return;
    this.loadingContact = true;
    this.authService.updateProfile(this.contactForm.value).subscribe({
      next: () => {
        this.messageContact = 'Cập nhật thành công!';
        this.loadingContact = false;
        setTimeout(() => this.messageContact = '', 3000);
      },
      error: () => {
        this.loadingContact = false;
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;
    if (this.passwordForm.value.new_password !== this.passwordForm.value.confirm_password) {
      this.messagePassword = 'Mật khẩu mới không khớp!';
      return;
    }

    this.loadingPassword = true;
    this.authService.changePassword(this.passwordForm.value).subscribe({
      next: () => {
        this.messagePassword = 'Đổi mật khẩu thành công!';
        this.loadingPassword = false;
        this.passwordForm.reset();
        setTimeout(() => this.messagePassword = '', 3000);
      },
      error: (err) => {
        this.messagePassword = err.error.error || 'Lỗi khi đổi mật khẩu.';
        this.loadingPassword = false;
      }
    });
  }
}
