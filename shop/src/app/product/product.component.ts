import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../component/header/header.component';
import { FooterComponent } from '../component/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../api/auth.service';
import { ReviewService } from '../api/review.service';
import { UserReportService } from '../api/user-report.service';
import { StarRatingComponent } from '../component/star-rating/star-rating.component';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

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

  // Báo cáo người bán → admin (UserReport)
  reportModalOpen = false;
  reportCategory = 'other';
  reportReason = '';
  reportImageFiles: File[] = [];
  reportSubmitting = false;
  reportError = '';

  readonly reportCategoryOptions = [
    { key: 'fraud', label: 'Lừa đảo / không giao hàng' },
    { key: 'wrong_item', label: 'Hàng không đúng mô tả' },
    { key: 'harassment', label: 'Quấy rối / ngôn từ xấu' },
    { key: 'spam', label: 'Spam / tài khoản ảo' },
    { key: 'other', label: 'Khác' },
  ];

  // Tab control
  activeReviewTab: string = 'product';

  /** Trung bình sao đánh giá sản phẩm (clamp 0–5) */
  get averageProductRating(): number {
    if (!this.reviews?.length) return 0;
    const sum = this.reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return Math.max(0, Math.min(5, sum / this.reviews.length));
  }

  /** Trung bình sao đánh giá người bán */
  get averageSellerRating(): number {
    if (!this.sellerReviews?.length) return 0;
    const sum = this.sellerReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
    return Math.max(0, Math.min(5, sum / this.sellerReviews.length));
  }

  /** Cho phép báo cáo khi đã login và không phải chính người bán sản phẩm này. */
  get canReportSeller(): boolean {
    const me = this.authService.getUserInfo();
    if (!this.product?.seller || !me?.id) return false;
    return Number(me.id) !== Number(this.product.seller);
  }

  constructor(
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private reviewService: ReviewService,
    private userReportService: UserReportService
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

  onRelatedImgError(event: Event): void {
    const el = event.target as HTMLImageElement;
    if (el) {
      el.src = 'assets/images/products/giay.jpg';
    }
  }

  openSellerReportModal(): void {
    if (!this.authService.isLoggedIn()) {
      alert('Vui lòng đăng nhập để báo cáo người bán.');
      return;
    }
    if (!this.canReportSeller) {
      alert('Bạn không thể báo cáo chính shop của mình.');
      return;
    }
    this.reportCategory = 'other';
    this.reportReason = '';
    this.reportImageFiles = [];
    this.reportError = '';
    this.reportModalOpen = true;
  }

  closeSellerReportModal(): void {
    this.reportModalOpen = false;
  }

  onReportImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const list = input.files ? Array.from(input.files) : [];
    this.reportImageFiles = list.slice(0, 5);
    input.value = '';
  }

  removeReportImageAt(i: number): void {
    this.reportImageFiles = this.reportImageFiles.filter((_, idx) => idx !== i);
  }

  submitSellerReport(): void {
    if (!this.product?.seller) return;
    const reason = this.reportReason.trim();
    if (reason.length < 15) {
      this.reportError = 'Vui lòng mô tả chi tiết ít nhất 15 ký tự.';
      return;
    }
    this.reportError = '';
    this.reportSubmitting = true;
    this.userReportService
      .submitUserReport(
        {
          target_user_id: Number(this.product.seller),
          reason,
          category: this.reportCategory,
          product_id: this.product.id,
        },
        this.reportImageFiles
      )
      .subscribe({
        next: () => {
          this.reportSubmitting = false;
          this.closeSellerReportModal();
          alert('Đã gửi báo cáo. Admin sẽ xem xét sớm nhất có thể.');
        },
        error: (err) => {
          this.reportSubmitting = false;
          const d = err.error?.detail;
          this.reportError =
            typeof d === 'string' ? d : Array.isArray(d) ? d.map((x: any) => x || '').join(' ') : 'Gửi báo cáo thất bại, vui lòng thử lại.';
        },
      });
  }

  /** Mở chi tiết sản phẩm từ block "You may also like" (ảnh / vùng ảnh) */
  goToRelatedDetail(id: string | number | null | undefined, event?: Event): void {
    event?.preventDefault();
    if (id == null || id === '') {
      return;
    }
    this.router.navigate(['/detail', String(id)]);
  }
}
