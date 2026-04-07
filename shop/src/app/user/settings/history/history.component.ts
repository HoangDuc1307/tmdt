import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../api/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  orders: any[] = [];
  loading = false;
  
  cancelForm!: FormGroup;
  selectedOrder: any = null;
  showCancelModal = false;
  message = '';

  constructor(private authService: AuthService, private fb: FormBuilder) {
    this.cancelForm = this.fb.group({
      type: ['cancel', Validators.required],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders() {
    this.loading = true;
    this.authService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openCancelModal(order: any) {
    this.selectedOrder = order;
    const type = (order.status === 'pending' || order.status === 'paid') ? 'cancel' : 'return';
    this.cancelForm.patchValue({ type, reason: '' });
    this.showCancelModal = true;
    this.message = '';
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.selectedOrder = null;
  }

  submitCancel() {
    if (this.cancelForm.invalid || !this.selectedOrder) return;

    this.authService.submitCancelReturnRequest(this.selectedOrder.id, this.cancelForm.value).subscribe({
      next: () => {
        this.message = 'Gửi yêu cầu thành công, đang chờ xử lý!';
        setTimeout(() => {
          this.closeCancelModal();
          this.loadOrders();
        }, 2000);
      },
      error: (err) => {
        this.message = err.error.error || 'Có lỗi xảy ra.';
      }
    });
  }

  getStatusBadgeClass(status: string) {
    const statusMap: any = {
      'pending': 'bg-warning',
      'paid': 'bg-info',
      'shipped': 'bg-primary',
      'delivered': 'bg-success',
      'canceled': 'bg-danger'
    };
    return statusMap[status] || 'bg-secondary';
  }

  getStatusLabel(status: string) {
    const statusMap: any = {
      'pending': 'Chờ thanh toán',
      'paid': 'Đã thanh toán',
      'shipped': 'Đang giao',
      'delivered': 'Đã giao',
      'canceled': 'Đã hủy'
    };
    return statusMap[status] || status;
  }
}
