import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../api/auth.service';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../component/header-admin/header-admin.component';


@Component({
  selector: 'app-product-manage',
  imports:[RouterOutlet,FormsModule,RouterModule,CommonModule,SidebarComponent,HeaderAdminComponent],
  templateUrl: './product-manage.component.html',
  styleUrls: ['./product-manage.component.css'],
  standalone: true,
})
export class ProductManageComponent implements OnInit {
  products: any[] =[];
  showDeleteModal: boolean = false;
  productToDelete: any = null;
  showSuccessMessage: boolean = false;
  selectedCategoryId: string = '';
  selectedStatus: string = ''; // Thêm biến selectedStatus
  allProducts: any[] = [];
  searchTerm: string = '';
  categories: any[] = []; 
  filteredProducts: any[] = []; 
  selectedDate: string = '';
  selectedApproved: string = ''; // Thêm biến selectedApproved
  showDeleteAllModal: boolean = false;
  
  // Sale form properties
  showSaleModal: boolean = false;
  productToSale: any = null;
  saleForm = {
    product: '',
    discount_percent: '',
    start_date: '',
    end_date: ''
  };
  saleMessage: string = '';
  saleError: string = '';
  allSaleProducts: any[] = []; // Thêm để lưu tất cả sale products
  
  constructor(private authService:AuthService){}
  
  ngOnInit() : void{
    this.loadProducts();
    this.loadCategories(); // Load categories
    this.loadAllSaleProducts(); // Debug: load tất cả sale products
  }

  loadCategories() {
    this.authService.getAllCategory().subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.categories = data;
        } else if (data && Array.isArray(data.results)) {
          this.categories = data.results;
        } else if (data && Array.isArray(data.data)) {
          this.categories = data.data;
        } else {
          this.categories = [];
        }
        console.log('Categories loaded:', this.categories);
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.categories = [];
      }
    });
  }

  onCategoryChange() {
    console.log('Category changed to:', this.selectedCategoryId);
    if (this.selectedCategoryId) {
      // Load products theo category được chọn
      this.loadProductsByCategory(this.selectedCategoryId);
    } else {
      // Load tất cả products
      this.loadProducts();
    }
  }

  onStatusChange() {
    console.log('Status changed to:', this.selectedStatus);
    this.applyFilters();
  }

  onDateChange() {
    console.log('Date changed to:', this.selectedDate);
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.products];
    
    if (this.selectedStatus) {
      const selectedStatusLower = this.selectedStatus.toLowerCase();
      result = result.filter(product => {
        const productStatus = product.status?.toLowerCase() || '';
        return productStatus === selectedStatusLower;
      });
    }
    
    if (this.selectedDate) {
      result = result.filter(product => {
        if (!product.created_at) return false;
        try {
          const pDate = new Date(product.created_at).toISOString().split('T')[0];
          return pDate === this.selectedDate;
        } catch(e) {
          return false;
        }
      });
    }
    
    if (this.selectedApproved) {
      const isApproved = this.selectedApproved === 'true';
      result = result.filter(product => product.is_approved === isApproved);
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(product => product.name && product.name.toLowerCase().includes(term));
    }
    
    this.filteredProducts = result;
    console.log('Filtered products:', this.filteredProducts);
  }

  loadAllSaleProducts() {
    this.authService.getActiveSaleProducts().subscribe({
      next: (data) => {
        console.log('All active sale products:', data);
        // Lưu danh sách sale products để sử dụng sau
        if (Array.isArray(data)) {
          this.allSaleProducts = data;
        } else if (data && Array.isArray(data.results)) {
          this.allSaleProducts = data.results;
        } else if (data && Array.isArray(data.data)) {
          this.allSaleProducts = data.data;
        } else {
          this.allSaleProducts = [];
        }
        console.log('Stored sale products:', this.allSaleProducts);
      },
      error: (err) => {
        console.error('Error loading sale products:', err);
        this.allSaleProducts = [];
      }
    });
  }
  loadProducts(): void {
    this.selectedCategoryId = ''; // Reset category selection
    this.selectedStatus = ''; // Reset status selection
    this.selectedApproved = ''; // Reset approved
    this.selectedDate = ''; // Reset date
    this.authService.getAllProducts().subscribe({
      next: (data: any) => {
        const productsArray = Array.isArray(data) ? data : [];
        this.products = productsArray.map((item: any) => ({
          ...item,
          image: item.image ? item.image : 'assets/images/products/giay.jpg'
        }));
        this.applyFilters();
        console.log('All products loaded:', this.products);
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.products = [];
        this.filteredProducts = [];
      }
    });
  }

  onApprovedChange() {
    this.applyFilters();
  }

  onApproveProduct(productId: number) {
    if (confirm('Bạn có chắc chắn muốn duyệt sản phẩm này?')) {
      this.authService.approveProduct(productId).subscribe({
        next: () => {
          this.showSuccessMessage = true;
          setTimeout(() => this.showSuccessMessage = false, 3000);
          this.reloadProducts();
        },
        error: (err) => {
          console.error('Lỗi duyệt sản phẩm:', err);
        }
      });
    }
  }

  onDeleteProduct(productId: number) {
    // Tìm sản phẩm cần xóa để hiển thị tên trong modal
    this.productToDelete = this.products.find(p => p.id === productId);
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.productToDelete) {
      this.authService.deleteProduct(this.productToDelete.id).subscribe({
        next: (res) => {
          console.log('Xóa thành công', res);
          this.showDeleteModal = false;
          this.showSuccessMessage = true;
          
          // Ẩn thông báo thành công sau 3 giây
          setTimeout(() => {
            this.showSuccessMessage = false;
          }, 3000);
          
          // Cập nhật lại danh sách sản phẩm theo category hiện tại
          this.reloadProducts();
        },
        error: (err) => {
          console.error('Lỗi khi xóa sản phẩm', err);
          this.showDeleteModal = false;
        }
      });
    }
  }

  // Method để reload products theo category hiện tại
  reloadProducts() {
    if (this.selectedCategoryId) {
      this.loadProductsByCategory(this.selectedCategoryId);
    } else {
      this.loadProducts();
    }
    // Áp dụng filter status sau khi reload
    setTimeout(() => {
      this.applyFilters();
    }, 100);
  }

  // Method để reset tất cả filters
  resetFilters() {
    this.selectedCategoryId = '';
    this.selectedStatus = '';
    this.selectedDate = '';
    this.loadProducts();
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  onDeleteAllProducts() {
    if (this.filteredProducts.length === 0) return;
    this.showDeleteAllModal = true;
  }

  cancelDeleteAll() {
    this.showDeleteAllModal = false;
  }

  confirmDeleteAll() {
    if (this.filteredProducts.length === 0) return;
    
    let deletedCount = 0;
    const totalToDelete = this.filteredProducts.length;
    const productsToDelete = [...this.filteredProducts];
    
    productsToDelete.forEach(p => {
      this.authService.deleteProduct(p.id).subscribe({
        next: () => {
          deletedCount++;
          if (deletedCount === totalToDelete) {
            this.showDeleteAllModal = false;
            this.showSuccessMessage = true;
            setTimeout(() => this.showSuccessMessage = false, 3000);
            this.reloadProducts();
          }
        },
        error: (err) => {
          console.error('Lỗi khi xóa sản phẩm', err);
          deletedCount++;
          if (deletedCount === totalToDelete) {
            this.showDeleteAllModal = false;
            this.reloadProducts();
          }
        }
      });
    });
  }
  loadProductsByCategory(categoryId: string): void {
    this.selectedCategoryId = categoryId;
    this.selectedStatus = ''; // Reset status selection
    
    this.authService.getProductByCategory(categoryId).subscribe({
      next: (data: any) => {
        const productsArray = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        this.products = productsArray.map((item: any) => ({
          ...item,
          image: item.image ? item.image : 'assets/images/products/giay.jpg'
        }));
        this.applyFilters(); 
        console.log('Products loaded by category:', this.products);
      },
      error: (error: any) => {
        console.error('Lỗi khi tải sản phẩm theo category:', error);
        this.products = [];
        this.filteredProducts = [];
      }
    });
  }

  onSaleProduct(product: any) {
    this.productToSale = product;
    this.saleForm = {
      product: product.id,
      discount_percent: '',
      start_date: new Date().toISOString().slice(0, 16), // timenow format
      end_date: ''
    };
    this.showSaleModal = true;
    this.saleMessage = '';
    this.saleError = '';
    
    // Kiểm tra xem sản phẩm đã có sale chưa
    this.checkExistingSale(product.id);
  }

  checkExistingSale(productId: number) {
    console.log('Checking sale for product ID:', productId);
    console.log('Available sale products:', this.allSaleProducts);
    
    // Tìm sale product từ danh sách đã load
    const existingSale = this.allSaleProducts.find(sale => sale.product === productId || sale.product_id === productId);
    
    if (existingSale) {
      console.log('Found existing sale:', existingSale);
      // Sản phẩm đã có sale, hiển thị thông tin hiện tại
      this.saleForm = {
        product: productId.toString(),
        discount_percent: existingSale.discount_percent ? existingSale.discount_percent.toString() : '',
        start_date: existingSale.start_date ? new Date(existingSale.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        end_date: existingSale.end_date ? new Date(existingSale.end_date).toISOString().slice(0, 16) : ''
      };
      this.saleMessage = 'Sản phẩm này đã có sale. Bạn có thể chỉnh sửa hoặc kết thúc sale.';
      console.log('Updated sale form:', this.saleForm);
    } else {
      console.log('No existing sale found in list, trying API call...');
      // Nếu không tìm thấy trong danh sách, thử gọi API riêng lẻ
      this.authService.getSaleProductByProductId(productId).subscribe({
        next: (saleData) => {
          console.log('Sale data from API:', saleData);
          if (saleData && (saleData.id || saleData.discount_percent)) {
            this.saleForm = {
              product: productId.toString(),
              discount_percent: saleData.discount_percent ? saleData.discount_percent.toString() : '',
              start_date: saleData.start_date ? new Date(saleData.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
              end_date: saleData.end_date ? new Date(saleData.end_date).toISOString().slice(0, 16) : ''
            };
            this.saleMessage = 'Sản phẩm này đã có sale. Bạn có thể chỉnh sửa hoặc kết thúc sale.';
            console.log('Updated sale form from API:', this.saleForm);
          } else {
            console.log('No existing sale found');
            this.saleMessage = '';
          }
        },
        error: (err) => {
          console.log('Error checking sale or no sale exists:', err);
          this.saleMessage = '';
        }
      });
    }
  }

  submitSaleForm() {
    if (!this.saleForm.discount_percent || !this.saleForm.end_date) {
      this.saleError = 'Vui lòng điền đầy đủ thông tin!';
      return;
    }

    const discountPercent = Number(this.saleForm.discount_percent);
    if (discountPercent <= 0 || discountPercent > 100) {
      this.saleError = 'Phần trăm giảm giá phải từ 1-100%!';
      return;
    }

    this.authService.createUpdateSaleProduct(this.saleForm).subscribe({
      next: (res) => {
        this.saleMessage = 'Cập nhật sale thành công!';
        this.showSaleModal = false;
        this.reloadProducts(); // Reload products theo category hiện tại
        setTimeout(() => {
          this.saleMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Lỗi khi tạo/cập nhật sale:', err);
        if (err.error && typeof err.error === 'object') {
          this.saleError = Object.entries(err.error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
        } else {
          this.saleError = 'Có lỗi xảy ra khi tạo/cập nhật sale!';
        }
      }
    });
  }

  endSale() {
    if (!this.productToSale) return;
    
    if (confirm('Bạn có chắc chắn muốn kết thúc sale cho sản phẩm này?')) {
      this.authService.deleteSaleProduct(this.productToSale.id).subscribe({
        next: (res) => {
          this.saleMessage = 'Đã kết thúc sale thành công!';
          this.showSaleModal = false;
          this.reloadProducts(); // Reload products to update status
          setTimeout(() => {
            this.saleMessage = '';
          }, 3000);
        },
        error: (err) => {
          console.error('Lỗi khi kết thúc sale:', err);
          this.saleError = 'Có lỗi xảy ra khi kết thúc sale!';
        }
      });
    }
  }

  cancelSale() {
    this.showSaleModal = false;
    this.productToSale = null;
    this.saleForm = {
      product: '',
      discount_percent: '',
      start_date: '',
      end_date: ''
    };
    this.saleMessage = '';
    this.saleError = '';
  }
}

