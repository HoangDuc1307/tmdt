import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../component/header/header.component';
import { FooterComponent } from '../component/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../api/auth.service';
import { ActivatedRoute, Router } from '@angular/router'; // Thêm Router
import { RouterModule } from '@angular/router';
import { ChatService } from '../api/chat.service';
@Component({
  selector: 'app-product',
  standalone: true,
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  imports: [FormsModule, CommonModule, HeaderComponent, FooterComponent, RouterModule]
})
export class ProductComponent implements OnInit {
  product: any = null;
  quantity: number = 1;
  message: string = '';
  relatedProducts: any[] = [];
  currentRelatedPage: number = 1;
  pageSizeRelated: number = 4;
  totalRelatedPages: number = 1;
  pagedRelatedProducts: any[] = [];

  // Thêm router vào constructor
  constructor(
    public authService: AuthService, 
    private route: ActivatedRoute,
    private router: Router,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.authService.getProductById(id).subscribe({
          next: (data: any) => {
            this.product = data;
            this.authService.getRelatedProducts(id).subscribe({
              next: (res: any) => {
                this.relatedProducts = Array.isArray(res) ? res : (res?.results || []);
                this.totalRelatedPages = Math.ceil(this.relatedProducts.length / this.pageSizeRelated) || 1;
                this.currentRelatedPage = 1;
                this.getRelatedProductsPage();
              },
              error: () => {
                this.relatedProducts = [];
                this.pagedRelatedProducts = [];
                this.totalRelatedPages = 1;
                this.currentRelatedPage = 1;
              }
            });
          },
          error: (err: any) => {
            this.product = null;
          }
        });
      }
    });
  }

  // Trong product.component.ts
  openChatWithSeller() {
  if (!this.authService.isLoggedIn()) {
    window.alert('Vui lòng đăng nhập để nhắn tin!');
    return;
  }

  // Lấy ID người bán (Đảm bảo key owner.id hoặc user_id đúng với API của Đạt)
  const sellerId = this.product?.owner?.id || this.product?.user_id || 1;
  const sellerName = this.product?.owner?.name || this.product?.user_name || 'Người bán';

  if (sellerId) {
    // Gọi hàm triggerChat trong Service để báo cho Header bật khung chat lên
    this.chatService.triggerChat(sellerId, sellerName);
    console.log('Đã gửi lệnh mở chat tới seller:', sellerId);
  }
}
// Trong product-detail.component.ts (hoặc file tương ứng của bạn)
chatWithSeller() {
  // Giả sử đối tượng sản phẩm của bạn là 'product'
  // và nó có thông tin người bán là 'product.seller_name' hoặc 'product.owner.username'
  const sellerId = this.product.owner.id; 
  const sellerName = this.product.owner.username; // Lấy tên người bán ở đây

  // Truyền cả ID và Tên vào Service
  this.chatService.triggerChat(sellerId, sellerName);
}
  getRelatedProductsPage() {
    const start = (this.currentRelatedPage - 1) * this.pageSizeRelated;
    const end = start + this.pageSizeRelated;
    this.pagedRelatedProducts = this.relatedProducts.slice(start, end);
  }

  goToRelatedPage(page: number) {
    if (page < 1 || page > this.totalRelatedPages) return;
    this.currentRelatedPage = page;
    this.getRelatedProductsPage();
  }

  addToCart() {
    if (!this.product) return;
    this.authService.addToCart(this.product.id, this.quantity).subscribe({
      next: (res) => {
        this.message = res.message || 'Đã thêm vào giỏ hàng';
      },
      error: (err) => {
        this.message = err.error?.error || 'Có lỗi xảy ra';
      }
    });
  }

  increaseQuantity() {
    if (this.product && this.quantity < this.product.quantity) {
      this.quantity++;
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
}