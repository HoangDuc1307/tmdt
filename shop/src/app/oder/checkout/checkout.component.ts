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
      if (this.isPaying) return;
      this.isPaying = true;

      if (window.confirm('Bạn có chắc chắn muốn thanh toán đơn hàng này?')) {
        const totalVnd = Math.round(Number(this.order?.total_price) || 0);
        this.authservice.updateOrderInfo(this.order.id, { total_price: totalVnd }).subscribe({
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

    payByMomo() {
      if (this.isPaying) return;
      if (!this.order?.id) {
        alert('Không tìm thấy đơn hàng.');
        return;
      }
      if (!window.confirm('Bạn có chắc chắn muốn thanh toán qua MoMo?')) return;

      this.isPaying = true;
      const totalVnd = Math.round(Number(this.order?.total_price) || 0);

      this.authservice.updateOrderInfo(this.order.id, { total_price: totalVnd }).subscribe({
        next: () => {
          this.authservice.initMomoPayment(this.order.id).subscribe({
            next: (res) => {
              if (res.pay_url) {
                window.location.href = res.pay_url;
              } else {
                alert('Không nhận được link thanh toán MoMo.');
                this.isPaying = false;
              }
            },
            error: (err: any) => {
              alert('Lỗi khởi tạo thanh toán MoMo: ' + (err.error?.error || 'Vui lòng thử lại.'));
              this.isPaying = false;
            }
          });
        },
        error: (err: any) => {
          alert('Có lỗi khi cập nhật giá đơn hàng! ' + (err.error?.error || ''));
          this.isPaying = false;
        }
      });
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