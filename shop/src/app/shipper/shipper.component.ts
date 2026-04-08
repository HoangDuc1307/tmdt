import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShipperService } from '../api/shipper.service';

@Component({
  selector: 'app-shipper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shipper.component.html',
  styleUrl: './shipper.component.css'
})
export class ShipperComponent implements OnInit { 
  orders: any[] = [];

  constructor(private shipperService: ShipperService) {}

  ngOnInit(): void {
    this.fetchOrders();
  }

  fetchOrders() {
    this.shipperService.getAvailableOrders().subscribe({
      next: (data: any) => {
        this.orders = data.results ? data.results : data;
      },
      error: (err) => console.error('Lỗi lấy đơn hàng:', err)
    });
  }

  // 1. Logic Nhận đơn
  onAccept(id: number) {
    this.shipperService.acceptOrder(id).subscribe({
      next: (res) => {
        alert('Đã nhận đơn! Vui lòng đi giao hàng.');
        // Cập nhật trạng thái ngay trên giao diện để đổi nút
        const order = this.orders.find(o => o.id === id);
        if (order) {
          order.status = 'shipping'; // Giả sử status lúc này chuyển sang shipping
        }
      },
      error: (err) => alert('Lỗi: ' + (err.error?.message || 'Không thể nhận đơn'))
    });
  }

  // 2. Logic Hoàn thành đơn
  onComplete(id: number) {
    if(confirm('Xác nhận bạn đã giao hàng thành công?')) {
      this.shipperService.completeOrder(id).subscribe({
        next: () => {
          alert('Hoàn thành đơn hàng!');
          // Sau khi hoàn thành thì mới xóa đơn này khỏi danh sách hiển thị
          this.orders = this.orders.filter(o => o.id !== id);
        },
        error: (err) => alert('Lỗi: Không thể cập nhật trạng thái')
      });
    }
  }
}