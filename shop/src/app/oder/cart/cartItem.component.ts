import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-oderItem',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cartItem.component.html',
  styleUrls: ['./cartItem.component.css']
})
export class CartItemComponent implements OnInit {
  cartData: any = null;
  product: any = null;
  quantity: number = 1;
  message: string = '';
  deletedItemIds: number[] = [];
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.getCart().subscribe({
      next: (data) => {
        this.cartData = data;
        if (this.cartData?.items) {
          for (const item of this.cartData.items) {
            item.tempQuantity = item.quantity;
          }
        }
      },
      error: (err) => {
        this.cartData = null;
      }
    });
  }

  get cartTotal(): number {
    if (!this.cartData?.items) return 0;
    return this.cartData.items.reduce(
      (total: number, item: any) => total + (item.product_price * this.getEffectiveQuantity(item)),
      0
    );
  }

  private getEffectiveQuantity(item: any): number {
    return Number(item?.tempQuantity ?? item?.quantity ?? 0);
  }

  increaseQuantity(item: any) {
    item.tempQuantity++;
  }

  decreaseQuantity(item: any) {
    if (item.tempQuantity > 1) {
      item.tempQuantity--;
    }
  }

  removeCartItem(item: any) {
    if (confirm('Bạn có muốn xóa sản phẩm này ra khỏi giỏ hàng không?')) {
      // Xóa khỏi UI
      this.cartData.items = this.cartData.items.filter((i: any) => i.id !== item.id);
      // Đánh dấu để xóa trên backend khi update
      this.deletedItemIds.push(item.id);
      this.message = 'Đã xóa sản phẩm khỏi giỏ hàng (chưa lưu). Nhấn Update Cart để xác nhận.';
    }
  }

  onUpdateCart() {
    this.saveCartChanges((hasError: boolean) => {
      this.reloadCart(hasError);
    });
  }

  private saveCartChanges(onDone: (hasError: boolean) => void) {
    if (!this.cartData?.items) {
      onDone(false);
      return;
    }
    let completedOps = 0;
    let hasError = false;
    const totalOps = this.deletedItemIds.length + this.cartData.items.length;

    if (totalOps === 0) {
      onDone(false);
      return;
    }

    const finishOne = () => {
      completedOps++;
      if (completedOps === totalOps) {
        this.deletedItemIds = [];
        onDone(hasError);
      }
    };

    for (const id of this.deletedItemIds) {
      this.authService.deleteCartItem(id).subscribe({
        next: () => finishOne(),
        error: () => {
          hasError = true;
          finishOne();
        }
      });
    }

    for (const item of this.cartData.items) {
      const nextQty = this.getEffectiveQuantity(item);
      this.authService.updateCartItem(item.id, nextQty).subscribe({
        next: () => {
          item.quantity = nextQty;
          finishOne();
        },
        error: () => {
          hasError = true;
          finishOne();
        }
      });
    }
  }

  reloadCart(hasError: boolean) {
    this.authService.getCart().subscribe({
      next: (data) => {
        this.cartData = data;
        if (this.cartData?.items) {
          for (const item of this.cartData.items) {
            item.tempQuantity = item.quantity;
          }
        }
        this.message = hasError ? 'Có lỗi khi cập nhật/xóa đơn hàng!' : 'Cập nhật đơn hàng thành công!';
      },
      error: () => {
        this.cartData = null;
        this.message = 'Có lỗi khi lấy lại giỏ hàng!';
      }
    });
  }

  onClearCart() {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?')) {
      this.authService.clearCart().subscribe({
        next: () => {
          this.cartData.items = [];
          this.message = 'Đã xóa toàn bộ giỏ hàng!';
        },
        error: () => {
          this.message = 'Có lỗi khi xóa giỏ hàng!';
        }
      });
    }
  }

  onCheckout() {
    if (!this.cartData?.items || this.cartData.items.length === 0) {
      this.message = 'Vui lòng thêm đơn hàng vào giỏ!';
      return;
    }
    this.saveCartChanges((hasError: boolean) => {
      if (hasError) {
        this.message = 'Có lỗi khi cập nhật giỏ hàng trước checkout!';
        return;
      }
      const totalVnd = this.cartData.items.reduce(
        (total: number, item: any) => total + (Number(item.product_price) || 0) * this.getEffectiveQuantity(item),
        0
      );
      console.log('Checkout (VND):', { total_price: totalVnd });
      // Gọi API checkout mà không truyền dữ liệu
      this.authService.createOrder().subscribe({
        next: (order: any) => {
          // Lưu orderId vào localStorage (xử lý cả trường hợp trả về order.order.id hoặc order.id)
          if (order.order && order.order.id) {
            localStorage.setItem('lastOrderId', order.order.id);
          } else if (order.id) {
            localStorage.setItem('lastOrderId', order.id);
          }
          // Chuyển hướng sang trang checkout
          window.location.href = '/checkout';
        },
        error: (err: any) => {
          console.error('Checkout error:', err);
          this.message = err?.error?.error || 'Có lỗi khi tạo đơn hàng!';
        }
      });
    });
  }
}