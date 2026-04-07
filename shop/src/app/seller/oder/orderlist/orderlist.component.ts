
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../../component/header-admin/header-admin.component';
import { AuthService } from '../../../api/auth.service';

@Component({
  selector: 'app-oderlist',
  standalone: true,
  imports:[CommonModule, FormsModule, RouterModule,SidebarComponent,HeaderAdminComponent],
  templateUrl:'orderlist.component.html',
  styleUrls: ['./orderlist.component.css'],
})
export class OrderListComponent {
  /** Đơn có sản phẩm của shop (seller đang đăng nhập) */
  private allOrders: any[] = [];
  orders: any[] = [];
  error: string = '';
  searchTerm: string = '';

  constructor(private authService: AuthService) {
    this.loadOrders();
  }

  loadOrders() {
    this.error = '';
    this.authService.getSellerOrders().subscribe({
      next: (data) => {
        const raw = Array.isArray(data) ? data : (data?.results || []);
        this.allOrders = raw;
        this.applySearchFilter();
      },
      error: (err) => {
        this.error = err.error?.detail || 'Không thể lấy danh sách đơn bán hàng';
        this.allOrders = [];
        this.orders = [];
      }
    });
  }

  /** Lọc cục bộ theo ô tìm kiếm (mã đơn, tên, trạng thái) */
  applySearchFilter(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) {
      this.orders = [...this.allOrders];
      return;
    }
    this.orders = this.allOrders.filter((o) => {
      const idMatch = String(o.id).includes(term);
      const fn = (o.user_profile?.first_name || '').toLowerCase();
      const ln = (o.user_profile?.last_name || '').toLowerCase();
      const nameMatch = fn.includes(term) || ln.includes(term) || `${fn} ${ln}`.trim().includes(term);
      const recv = (o.receiver_name || '').toLowerCase();
      const statusMatch = (o.status || '').toLowerCase().includes(term);
      return idMatch || nameMatch || recv.includes(term) || statusMatch;
    });
  }

  onSearchInput(): void {
    this.applySearchFilter();
  }
}
