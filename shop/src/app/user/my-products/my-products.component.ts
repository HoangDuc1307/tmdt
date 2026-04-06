import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../api/auth.service';
import { HeaderComponent } from '../../component/header/header.component';
import { FooterComponent } from '../../component/footer/footer.component';

@Component({
  selector: 'app-my-products',
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './my-products.component.html',
  standalone: true
})
export class MyProductsComponent implements OnInit {
  products: any[] = [];
  searchTerm: string = '';
  
  constructor(private authService: AuthService, private router: Router) {}
  
  ngOnInit() {
    this.loadMyProducts();
  }
  
  get filteredProducts() {
    if (!this.searchTerm) {
      return this.products;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.products.filter(p => p.name && p.name.toLowerCase().includes(lowerTerm));
  }
  
  loadMyProducts() {
    this.authService.getMyProducts().subscribe({
      next: (data) => {
        this.products = data;
      },
      error: (err) => {
        console.error('Error loading my products', err);
      }
    });
  }
  
  deleteProduct(id: number) {
    if (confirm('Bạn có chắc muốn xoá sản phẩm này?')) {
      this.authService.deleteProduct(id).subscribe({
        next: () => {
          this.loadMyProducts();
        },
        error: (err) => {
          console.error('Delete error', err);
        }
      });
    }
  }
}
