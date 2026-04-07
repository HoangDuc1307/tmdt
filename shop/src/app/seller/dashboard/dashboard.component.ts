import { Component, OnInit } from '@angular/core';
import { SidebarComponent } from '../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../component/header-admin/header-admin.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [SidebarComponent, HeaderAdminComponent,CommonModule,RouterOutlet,FormsModule],
})
export class DashBoardComponent implements OnInit{
  sortOrder: string = '';
  products: any[] = [];
  filteredProducts: any[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  totalProducts: number = 0;
  product: any = null;
  quantity: number = 1;
  message: string = '';
  searchTerm: string = '';
  allProducts: any[] = [];
  pageSize: number = 12;
  selectedCategoryId: string = '';
  priceRange: { min: number, max: number|null } | null = null;

  constructor(private authService: AuthService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.loadAllProducts();
    });
  }


  loadAllProducts(): void {
    this.authService.getAllProducts().subscribe({
      next: (data: any) => {
        const productsArray = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        this.allProducts = productsArray.map((item: any) => ({
          ...item,
          image: item.image ? item.image : 'assets/images/products/giay.jpg'
        }));
        this.applyFilterAndPaging();
      },
      error: (error: any) => {
        console.error('Lỗi khi tải sản phẩm:', error);
      }
    });
  }
  applyFilterAndPaging() {
    // Lọc theo search
    let filtered = this.allProducts;
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(product =>
        product.name && product.name.toLowerCase().includes(term)
      );
    }
    // Lọc theo khoảng giá
    if (this.priceRange) {
      filtered = filtered.filter(product => {
        if (product.price == null || this.priceRange == null) return false;
        const price = parseFloat(product.price);
        if (this.priceRange.max === null) {
          return price >= this.priceRange.min;
        }
        return price >= this.priceRange.min && price < this.priceRange.max;
      });
    }
    // Sắp xếp
    if (this.sortOrder === 'price') {
      filtered = filtered.slice().sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (this.sortOrder === 'price-desc') {
      filtered = filtered.slice().sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }
    this.totalProducts = filtered.length;
    this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
    // Phân trang
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredProducts = filtered.slice(start, end);
  }
}
