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
  message: string = '';

  // Phân trang & Lọc
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;
  totalProducts: number = 0;

  searchTerm: string = '';
  selectedCategoryId: string = '';
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

  applyFilterAndPaging() {
    let filtered = [...this.allProducts];

    // Lọc theo tìm kiếm
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(p => p.name?.toLowerCase().includes(term));
    }

    // Lọc theo Category
    if (this.selectedCategoryId) {
      filtered = filtered.filter(p => p.category == this.selectedCategoryId);
    }

    // Lọc theo khoảng giá
    if (this.priceRange) {
      filtered = filtered.filter(p => {
        const price = parseFloat(p.price);
        if (this.priceRange!.max === null) return price >= this.priceRange!.min;
        return price >= this.priceRange!.min && price <= this.priceRange!.max;
      });
    }

    // Sắp xếp
    if (this.sortOrder === 'price') {
      filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (this.sortOrder === 'price-desc') {
      filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
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
