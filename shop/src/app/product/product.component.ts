import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../component/header/header.component';
import { FooterComponent } from '../component/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../api/auth.service';
import { ReviewService } from '../api/review.service';
import { StarRatingComponent } from '../component/star-rating/star-rating.component';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-product',
  standalone: true,
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  imports: [FormsModule, CommonModule, HeaderComponent, FooterComponent, RouterModule, StarRatingComponent]
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

  // Reviews properties
  reviews: any[] = [];
  newReviewRating: number = 5;
  newReviewComment: string = '';
  submittingReview: boolean = false;

  // Seller Reviews properties
  sellerReviews: any[] = [];
  newSellerReviewRating: number = 5;
  newSellerReviewComment: string = '';
  submittingSellerReview: boolean = false;

  // Tab control
  activeReviewTab: string = 'product';

  constructor(
    public authService: AuthService, 
    private route: ActivatedRoute,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProduct(id);
        this.loadReviews(id);
      }
    });
  }

  loadProduct(id: string) {
    this.authService.getProductById(id).subscribe({
      next: (data: any) => {
        this.product = data;
        this.loadRelatedProducts(id);
        if (this.product.seller) {
          this.loadSellerReviews(this.product.seller);
        }
      },
      error: (err: any) => {
        this.product = null;
      }
    });
  }

  loadReviews(productId: any) {
    this.reviewService.getProductReviews(productId).subscribe({
      next: (data: any) => {
        this.reviews = Array.isArray(data) ? data : (data?.results || []);
      },
      error: (err) => console.error('Lỗi khi tải đánh giá sản phẩm:', err)
    });
  }

  loadRelatedProducts(id: string) {
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
  }

  loadSellerReviews(sellerId: any) {
    this.reviewService.getSellerReviews(sellerId).subscribe({
      next: (data: any) => {
        this.sellerReviews = Array.isArray(data) ? data : (data?.results || []);
      },
      error: (err) => console.error('Lỗi khi tải đánh giá người bán:', err)
    });
  }

  submitReview() {
    if (!this.authService.isLoggedIn()) {
      alert('Vui lòng đăng nhập để đánh giá sản phẩm!');
      return;
    }
    if (!this.newReviewComment.trim()) {
      alert('Vui lòng nhập nội dung đánh giá!');
      return;
    }

    this.submittingReview = true;
    const reviewData = {
      product: this.product.id,
      rating: this.newReviewRating,
      comment: this.newReviewComment
    };

    this.reviewService.addProductReview(reviewData).subscribe({
      next: (res) => {
        alert('Cảm ơn bạn đã đánh giá sản phẩm!');
        this.newReviewComment = '';
        this.newReviewRating = 5;
        this.loadReviews(this.product.id);
        this.submittingReview = false;
      },
      error: (err) => {
        alert('Có lỗi xảy ra: ' + (err.error?.detail || 'Vui lòng thử lại'));
        this.submittingReview = false;
      }
    });
  }

  submitSellerReview() {
    if (!this.authService.isLoggedIn()) {
      alert('Vui lòng đăng nhập để đánh giá người bán!');
      return;
    }
    if (!this.newSellerReviewComment.trim()) {
      alert('Vui lòng nhập nội dung đánh giá người bán!');
      return;
    }

    this.submittingSellerReview = true;
    const reviewData = {
      seller: this.product.seller,
      rating: this.newSellerReviewRating,
      comment: this.newSellerReviewComment
    };

    this.reviewService.addSellerReview(reviewData).subscribe({
      next: (res) => {
        alert('Cảm ơn bạn đã đánh giá người bán!');
        this.newSellerReviewComment = '';
        this.newSellerReviewRating = 5;
        this.loadSellerReviews(this.product.seller);
        this.submittingSellerReview = false;
      },
      error: (err) => {
        alert('Có lỗi xảy ra: ' + (err.error?.detail || 'Vui lòng thử lại'));
        this.submittingSellerReview = false;
      }
    });
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
