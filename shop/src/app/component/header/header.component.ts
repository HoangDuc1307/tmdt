import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../api/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../api/chat.service'; // Đảm bảo đúng đường dẫn
import { NotificationService } from '../../api/notification.service';
import { Subscription } from 'rxjs';
// Đi ra khỏi 'header', đi ra khỏi 'component', rồi mới vào 'chat'
import { ChatComponent } from '../../chat/chat.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [RouterModule, CommonModule, FormsModule, ChatComponent],
  standalone:true
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Trong header.component.ts
isChatOpen: boolean = false; 

toggleChat() {
  // Dòng này cực quan trọng: Đảo ngược giá trị hiện tại
  this.isChatOpen = !this.isChatOpen; 
  
  // Xóa cái alert cũ đi, dùng console.log để kiểm tra cho sạch
  console.log('Trạng thái khung chat hiện tại:', this.isChatOpen);
}
  onCartIconClick() {
    if (this.authService.isLoggedIn()) {
      this.reloadCart(false);
    } else {
      this.router.navigate(['/login']);
    }
  }
  searchTerm: string = '';
  @Output() search = new EventEmitter<string>();
  unreadCount: number = 0;
  notifications: any[] = [];
  cartItemCount: number = 0;
  username = '';
  password = '';
  message = '';
  error = '';
  cartData: any = null;
  product: any = null;
  quantity: number = 1;
  deletedItemIds: number[] = [];
  private chatStateSub?: Subscription;
  private notificationPollerId: ReturnType<typeof setInterval> | null = null;

  constructor(
    public authService: AuthService,
    private router: Router,
    private chatService: ChatService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
  // Chỉ gọi lấy giỏ hàng khi đã đăng nhập
  if (this.authService.isLoggedIn()) {
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
 // Sửa dòng 69 trong header.component.ts
this.chatStateSub = this.chatService.chatState$.subscribe((state: any) => { // Thêm : any và đóng mở ngoặc đơn
  this.isChatOpen = state.open;
  if (state.open) {
    console.log('Header: Khung chat đã mở cho seller:', state.recipientId);
  }
});

if (this.authService.isLoggedIn()) {
  this.loadNotifications();
  this.startNotificationPolling();
}

}
  ngOnDestroy(): void {
    this.chatStateSub?.unsubscribe();
    this.stopNotificationPolling();
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.results || []);
        this.notifications = list;
        this.unreadCount = list.filter((n: any) => !n.is_read).length;
      },
      error: () => {
        this.notifications = [];
        this.unreadCount = 0;
      }
    });
  }

  markNotificationAsRead(notification: any, event?: Event) {
    if (event) {
      event.preventDefault();
    }
    if (!notification || notification.is_read) {
      return;
    }
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  private startNotificationPolling() {
    this.stopNotificationPolling();
    this.notificationPollerId = setInterval(() => {
      if (this.authService.isLoggedIn()) {
        this.loadNotifications();
      }
    }, 30000);
  }

  private stopNotificationPolling() {
    if (this.notificationPollerId) {
      clearInterval(this.notificationPollerId);
      this.notificationPollerId = null;
    }
  }
  goToMessages() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/messages']);
    } else {
      this.router.navigate(['/login']);
    }
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
      // Xóa khỏi backend ngay lập tức
      this.authService.deleteCartItem(item.id).subscribe({
        next: () => {
          // Xóa khỏi UI
          this.cartData.items = this.cartData.items.filter((i: any) => i.id !== item.id);
          this.message = 'Đã xóa sản phẩm khỏi giỏ hàng!';
        },
        error: () => {
          this.message = 'Có lỗi khi xóa sản phẩm khỏi giỏ hàng!';
        }
      });
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

  logout() {
    this.authService.logout().subscribe({
      next: (res: any) => {
        console.log('Đăng xuất thành công:', res.message);
        // Xóa local storage và chuyển hướng về trang chủ
        this.authService.clearLocalStorage();
        this.notifications = [];
        this.unreadCount = 0;
        this.stopNotificationPolling();
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        console.error('Lỗi đăng xuất:', err);
        // Vẫn xóa local storage và chuyển hướng ngay cả khi có lỗi
        this.authService.clearLocalStorage();
        this.notifications = [];
        this.unreadCount = 0;
        this.stopNotificationPolling();
        this.router.navigate(['/']);
      }
    });
  }

  goToCart() {
    if (this.authService.isLoggedIn()) {
      this.reloadCart(false); // Tự động load lại giỏ hàng khi click icon
      this.router.navigate(['/cart']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  onUserIconClick() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/userprofile']);
    } else {
      window.alert('Vui lòng đăng nhập để xem trang cá nhân!');
      // Có thể thay window.alert bằng snackbar/toast nếu muốn đẹp hơn
    }
  }

  goToAdminManage() {
    this.router.navigate(['/admin']);
  }

  goToManageProduct(event: Event) {
    event.preventDefault();
    this.router.navigate(['/seller/manage']);
  }

  onSearch() {
    // Thêm log để kiểm tra click
    console.log('HeaderAdmin search click:', this.searchTerm);
    this.search.emit(this.searchTerm);
  }
  onSubmit() {
  this.message = '';
  this.error = '';
  
  this.authService.login({ username: this.username, password: this.password })
    .subscribe({
      next: (res) => { 
        this.message = res.message; 
        this.authService.saveTokens(res.access, res.refresh, res.user);

        // --- PHẦN TIN NHẮN & GIỎ HÀNG ---
        this.loadNotifications();
        this.startNotificationPolling();
        this.reloadCart(false); // Tiện tay cập nhật luôn giỏ hàng cho đồng bộ
        // -------------------------------

        // Đóng modal signin
        const modal = document.getElementById('signInModal');
        if (modal) {
          const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
          if (modalInstance) modalInstance.hide();
        }

        // Điều hướng
        if (res.user && res.user.is_staff === true) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => { 
        this.error = err.error?.error || 'Đăng nhập thất bại'; 
      }
    });
  }
   onRegister() {
    // Chuyển hướng sang trang đăng ký
    this.router.navigate(['/register']);
  }

}