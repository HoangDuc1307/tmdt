import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../api/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-paid',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './paid.component.html',
  styleUrls: ['./paid.component.css']
})
export class PaidComponent implements OnInit {
  order: any = null;
  orderItems: any[] = [];
  userProfile: any = null;
  message: string = '';
  constructor(private authservice: AuthService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    let orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      orderId = localStorage.getItem('lastOrderId');
    }
    if (orderId) {
      this.authservice.getOrderById(orderId).subscribe({
        next: (order) => {
          this.order = order;
          this.orderItems = order.items || [];
          this.userProfile = order.user_profile || null;
        },
        error: () => {
          this.message = 'Không tìm thấy đơn hàng.';
        }
      });
    } else {
      this.message = 'Không tìm thấy đơn hàng.';
    }
  }
}