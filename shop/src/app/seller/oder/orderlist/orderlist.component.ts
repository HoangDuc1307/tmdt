
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
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
  orders: any[] = [];
  error: string = '';
  searchTerm: string = '';

  constructor(private authService: AuthService) {
    this.loadOrders();
  }

  onSearch(term: string) {
    console.log('OrderList received search:', term); // Thêm log để debug
    this.searchTerm = term;
    this.loadOrders(term);
  }

  loadOrders(searchTerm: string = '') {
    this.authService.getAllOrdersAdmin(searchTerm).subscribe({
      next: (data) => {
        this.orders = Array.isArray(data) ? data : (data.results || []);
      },
      error: (err) => {
        this.error = err.error?.detail || 'Không thể lấy danh sách đơn hàng';
      }
    });
  }

  deleteOrder(orderId: number) {
    if (window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
      this.authService.deleteOrderAdmin(orderId).subscribe({
        next: () => {
          this.orders = this.orders.filter(o => o.id !== orderId);
        },
        error: (err) => {
          alert('Xóa đơn hàng thất bại: ' + (err.error?.detail || ''));
        }
      });
    }
  }
}
