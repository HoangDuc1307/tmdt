import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../api/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [RouterModule, CommonModule, FormsModule],
  standalone:true
})
export class HeaderComponent implements OnInit {
  onCartIconClick() {
    if (this.authService.isLoggedIn()) {
      this.reloadCart(false);
    } else {
      this.router.navigate(['/login']);
    }
  }
  searchTerm: string = '';
  @Output() search = new EventEmitter<string>();
  cartItemCount: number = 0;
  username = '';
  password = '';
  message = '';
  error = '';
  cartData: any = null;
  product: any = null;
  quantity: number = 1;
  deletedItemIds: number[] = [];
  USD_TO_VND = 25000;


  constructor(public authService: AuthService, private router: Router) {}

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
    return this.cartData.items.reduce((total: number, item: any) => total + (item.product_price * item.quantity), 0);
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
    if (!this.cartData?.items) return;
    let updateCount = 0;
    const totalItems = this.cartData.items.length + this.deletedItemIds.length;
    let hasError = false;
    // Xóa các item đã chọn
    for (const id of this.deletedItemIds) {
      this.authService.deleteCartItem(id).subscribe({
        next: () => {
          updateCount++;
          if (updateCount === totalItems) this.reloadCart(hasError);
        },
        error: () => {
          updateCount++;
          hasError = true;
          if (updateCount === totalItems) this.reloadCart(hasError);
        }
      });
    }
    // Cập nhật số lượng các item còn lại
    for (const item of this.cartData.items) {
      this.authService.updateCartItem(item.id, item.tempQuantity).subscribe({
        next: () => {
          updateCount++;
          if (updateCount === totalItems) this.reloadCart(hasError);
        },
        error: () => {
          updateCount++;
          hasError = true;
          if (updateCount === totalItems) this.reloadCart(hasError);
        }
      });
    }
    // Xóa danh sách đã xóa sau khi gửi
    this.deletedItemIds = [];
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
    // Tính tổng giá USD
    const totalUSD = this.cartData.items.reduce((total: number, item: any) => total + (item.product_price * item.quantity), 0);
    // Quy đổi sang VND
    const totalVND = Math.round(totalUSD * this.USD_TO_VND);
    console.log('Checkout data:', { total_price: totalVND });
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
  }

  logout() {
    this.authService.logout().subscribe({
      next: (res: any) => {
        console.log('Đăng xuất thành công:', res.message);
        // Xóa local storage và chuyển hướng về trang chủ
        this.authService.clearLocalStorage();
        this.router.navigate(['/']);
      },
      error: (err: any) => {
        console.error('Lỗi đăng xuất:', err);
        // Vẫn xóa local storage và chuyển hướng ngay cả khi có lỗi
        this.authService.clearLocalStorage();
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

  goToAddProduct(event: Event) {
    event.preventDefault();
    this.router.navigate(['/add_product']);
  }

  goToMyProducts(event: Event) {
    event.preventDefault();
    this.router.navigate(['/my-products']);
  }

  goToAddCategory(event: Event) {
    event.preventDefault();
    this.router.navigate(['/category']);
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
          
          // Hiển thị tokens trong console
          console.log('Access Token:', res.access);
          console.log('Refresh Token:', res.refresh);
          console.log('User info:', res.user);
          
          // Lưu JWT tokens và thông tin user vào localStorage
          this.authService.saveTokens(res.access, res.refresh, res.user);

          // Đóng modal signin
          const modal = document.getElementById('signInModal');
          if (modal) {
            const modalInstance = (window as any).bootstrap?.Modal?.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            } else {
              // Fallback nếu không có Bootstrap Modal instance
              modal.style.display = 'none';
              modal.classList.remove('show');
              document.body.classList.remove('modal-open');
              const backdrop = document.querySelector('.modal-backdrop');
              if (backdrop) {
                backdrop.remove();
              }
            }
          }

          // Điều hướng dựa trên quyền admin
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
