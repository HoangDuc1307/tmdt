import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../api/auth.service';
import { RouterModule, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  title = 'shop';
  allProducts: any[] = [];
  filteredProducts: any[] = [];
  categoryOptions: Array<{ id: string; name: string }> = [];
  message: string = '';

  // Phân trang & Lọc
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;
  totalProducts: number = 0;

  searchTerm: string = '';
  selectedCategoryId: string = '';
  selectedStatus: string = '';
  sortOrder: string = '';
  priceRange: { min: number, max: number | null } | null = null;

  constructor(public authService: AuthService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['search'] || '';
      this.loadAllProducts();
    });
  }

  loadAllProducts(): void {
    this.authService.getAllProducts().subscribe({
      next: (data: any) => {
        const productsArray = Array.isArray(data) ? data : (data?.results || []);
        this.allProducts = productsArray.map((item: any) => ({
          ...item,
          image: item.image || 'assets/images/products/giay.jpg'
        }));
        this.buildCategoryOptions();
        this.applyFilterAndPaging();
      },
      error: (error) => {
        console.error('Lỗi khi tải sản phẩm:', error);
      }
    });
  }

  loadProductsByCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  filterByPriceRange(min: number, max: number | null): void {
    this.priceRange = { min, max };
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  onImgError(event: any) {
    event.target.src = 'assets/images/products/giay.jpg';
  }

  // Alias cho template cũ
  addToCart(product: any) {
    this.onAddToCart(product);
  }

  onAddToCart(product: any) {
    if (!product) return;
    this.authService.addToCart(product.id, 1).subscribe({
      next: (res: any) => {
        this.message = res.message || 'Đã thêm vào giỏ hàng!';
        setTimeout(() => this.message = '', 2000);
      },
      error: (err: any) => {
        this.message = err.error?.error || 'Vui lòng đăng nhập để thêm vào giỏ hàng!';
        setTimeout(() => this.message = '', 2000);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  onFilter(): void {
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedCategoryId = '';
    this.selectedStatus = '';
    this.sortOrder = '';
    this.priceRange = null;
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  isPriceRangeActive(min: number, max: number | null): boolean {
    if (!this.priceRange) return false;
    return this.priceRange.min === min && this.priceRange.max === max;
  }

  private buildCategoryOptions(): void {
    const byId = new Map<string, string>();
    for (const p of this.allProducts) {
      const categoryId = p?.category?.id ?? p?.category;
      const categoryName = p?.category?.name;
      if (categoryId !== null && categoryId !== undefined && categoryName) {
        byId.set(String(categoryId), String(categoryName));
      }
    }
    this.categoryOptions = Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }

  private normalizeStatus(status: any): string {
    return String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
  }

  applyFilterAndPaging() {
    let filtered = [...this.allProducts];

    // Lọc theo tìm kiếm
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(term));
    }

    // Lọc theo Category
    if (this.selectedCategoryId) {
      filtered = filtered.filter(p => String(p?.category?.id ?? p?.category ?? '') === this.selectedCategoryId);
    }

    // Lọc theo trạng thái
    if (this.selectedStatus) {
      filtered = filtered.filter(p => this.normalizeStatus(p.status) === this.selectedStatus);
    }

    // Lọc theo khoảng giá
    if (this.priceRange) {
      filtered = filtered.filter(p => {
        const effectivePrice = parseFloat(p.current_price ?? p.price);
        if (this.priceRange!.max === null) return effectivePrice >= this.priceRange!.min;
        return effectivePrice >= this.priceRange!.min && effectivePrice <= this.priceRange!.max;
      });
    }

    // Sắp xếp
    if (this.sortOrder === 'price') {
      filtered.sort((a, b) => parseFloat(a.current_price ?? a.price) - parseFloat(b.current_price ?? b.price));
    } else if (this.sortOrder === 'price-desc') {
      filtered.sort((a, b) => parseFloat(b.current_price ?? b.price) - parseFloat(a.current_price ?? a.price));
    }

    this.totalProducts = filtered.length;
    this.totalPages = Math.ceil(this.totalProducts / this.pageSize);

    // Phân trang
    const start = (this.currentPage - 1) * this.pageSize;
    this.filteredProducts = filtered.slice(start, start + this.pageSize);
  }

  onSortChange(event: any) {
    this.sortOrder = event.target.value;
    this.currentPage = 1;
    this.applyFilterAndPaging();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.applyFilterAndPaging();
  }
}
