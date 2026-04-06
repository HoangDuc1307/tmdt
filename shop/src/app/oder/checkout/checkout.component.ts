import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckOutComponent implements OnInit {
    order: any = null;
    orderItems: any[] = [];
    shippingInfo: any = {
      first_name: '',
      last_name: '',
      address: '',
      phone: '',
      email: ''
    };
    message: string = '';
    USD_TO_VND = 25000;
    isPaying: boolean = false; // Thêm biến này để chặn double click
    constructor(private authservice: AuthService, private router: Router){}
    
    ngOnInit(): void {
        const orderId = localStorage.getItem('lastOrderId');
        if (orderId) {
          this.authservice.getOrderById(orderId).subscribe({
            next: (order) => {
              this.order = order;
              this.orderItems = order.items || [];
              this.shippingInfo = {
                receiver_name: order.receiver_name || '',
                address: order.address || '',
                phone: order.phone || '',
                email: order.email || ''
              };
            },
            error: () => {
              this.message = 'Không tìm thấy đơn hàng.';
            }
          });
        } else {
          this.message = 'Không tìm thấy đơn hàng.';
        }
    }

    payOrder() {
      if (this.isPaying) return; // Chặn double click
      this.isPaying = true;

      if (window.confirm('Bạn có chắc chắn muốn thanh toán đơn hàng này?')) {
        const priceVND = Math.round((this.order?.total_price || 0) * this.USD_TO_VND);
        this.authservice.updateOrderInfo(this.order.id, { total_price: priceVND }).subscribe({
          next: () => {
            this.authservice.payOrder(this.order.id).subscribe({
              next: (res: any) => {
                alert('Thanh toán thành công!');
                this.router.navigate(['/paid']);
                this.isPaying = false;
              },
              error: (err: any) => {
                alert('Có lỗi khi thanh toán đơn hàng! ' + (err.error?.error || ''));
                this.isPaying = false;
              }
            });
          },
          error: (err: any) => {
            alert('Có lỗi khi cập nhật giá đơn hàng! ' + (err.error?.error || ''));
            this.isPaying = false;
          }
        });
      } else {
        this.isPaying = false;
      }
    }

    updateOrderInfo() {
      if (!this.order?.id) return;
      this.authservice.updateOrderInfo(this.order.id, this.shippingInfo).subscribe({
        next: (res) => {
          // Có thể hiện thông báo thành công nếu muốn
        },
        error: (err) => {
          // Có thể hiện thông báo lỗi nếu muốn
        }
      });
    }
}