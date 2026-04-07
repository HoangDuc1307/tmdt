import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../api/auth.service';
import { SidebarComponent } from '../../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../../component/header-admin/header-admin.component';

@Component({
  selector: 'app-orderdetail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,SidebarComponent,HeaderAdminComponent],
  templateUrl: './orderdetail.component.html',
  styleUrls: ['./orderdetail.component.css']
})
export class OderDetailComponent  implements OnInit {
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
        if (this.authservice.isAdmin()) {
          this.authservice.getOrderByIdAdmin(Number(orderId)).subscribe({
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
        }
      } else {
        this.message = 'Không tìm thấy đơn hàng.';
      }
    }

  markAsDelivered() {
    if (!this.order?.id) return;
    if (window.confirm('Bạn có chắc chắn muốn xác nhận đã giao hàng đơn này?')) {
      this.authservice.markOrderDelivered(this.order.id).subscribe({
        next: (order) => {
          this.order.status = 'delivered';
          alert('Đã giao hàng thành công!');
        },
        error: (err) => {
          alert('Cập nhật trạng thái thất bại: ' + (err.error?.detail || ''));
        }
      });
    }
  }
  }