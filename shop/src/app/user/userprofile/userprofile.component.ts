import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../api/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './userprofile.component.html',
  styleUrls: ['./userprofile.componet.css']
})
export class UserProfileComponent implements OnInit {
  profile: any = null;
  error: string = '';
  order: any[] = [];
  message:string ='';
  totalOrder: number = 0;
  totalPrice: number = 0;
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Không thể lấy thông tin người dùng';
      }
    });
    this.authService.getOrders().subscribe({
      next: (order: any) => {
        // Đảm bảo order luôn là mảng
        const orderArray = Array.isArray(order)
          ? order
          : Array.isArray(order?.results)
            ? order.results
            : [];
        this.order = orderArray;
        this.totalOrder = orderArray.length;
        this.totalPrice = orderArray.reduce((sum: any, o: any) => sum + (parseFloat(o.total_price) || 0), 0);
      },
      error: (err: any) => {
        this.message ='Không tìm thấy đơn hàng nào'
      }
    });
  }

  goToUpdateProfile() {
    this.router.navigate(['/userupdate']);
  }
}