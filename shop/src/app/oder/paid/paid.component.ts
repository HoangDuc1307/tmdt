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
  confirmingReceived = false;
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

  onConfirmReceived() {
    if (!this.order?.id) {
      this.message = 'Không tìm thấy đơn hàng để xác nhận.';
      return;
    }
    if (this.order.status !== 'delivered') {
      this.message = 'Đơn hàng chưa ở trạng thái đã giao.';
      return;
    }
    if (this.confirmingReceived) return;

    this.confirmingReceived = true;
    this.authservice.confirmOrderReceived(this.order.id).subscribe({
      next: (res: any) => {
        this.message = res?.message || 'Xác nhận nhận hàng thành công.';
        this.order.status = 'confirmed_received';
        this.confirmingReceived = false;
      },
      error: (err: any) => {
        this.message = err?.error?.error || 'Không thể xác nhận nhận hàng.';
        this.confirmingReceived = false;
      }
    });
  }
}