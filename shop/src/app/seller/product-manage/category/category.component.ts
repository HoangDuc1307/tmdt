import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../../component/header-admin/header-admin.component';
import { AuthService } from '../../../api/auth.service';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css'],
  standalone : true,
  imports: [RouterOutlet,FormsModule,RouterModule,CommonModule,SidebarComponent,HeaderAdminComponent],
})
export class CategoryComponent implements OnInit {
    categories: any[] = [];
    filteredCategories: any[] = [];
    category: any = {
        name: '',
        slug: '',
        description: '',
        parent: null
    };
    loading = false;
    error = '';
    searchTerm = '';
    categoryProductCounts: { [key: number]: number } = {};

    ngOnInit() {
        // Ensure arrays are initialized
        this.categories = [];
        this.filteredCategories = [];
        this.loadCategories();
    }

    constructor(public authService: AuthService) {}

    loadCategories() {
        this.loading = true;
        this.error = '';
        this.authService.getAllCategory().subscribe({
            next: (data) => {
                console.log('API Response:', data); // Debug log
                // Handle different response formats
                if (Array.isArray(data)) {
                    this.categories = data;
                } else if (data && Array.isArray(data.results)) {
                    // Django REST Framework pagination format
                    this.categories = data.results;
                } else if (data && Array.isArray(data.data)) {
                    // Custom API format
                    this.categories = data.data;
                } else {
                    console.warn('Unexpected data format:', data);
                    this.categories = [];
                }
                console.log('Processed categories:', this.categories); // Debug log
                this.filteredCategories = [...this.categories];
                
                // Load product counts for each category
                this.loadProductCounts();
                
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading categories:', error);
                this.error = 'Failed to load categories';
                this.loading = false;
                this.categories = [];
                this.filteredCategories = [];
            }
        });
    }

    loadProductCounts() {
        if (!Array.isArray(this.categories)) return;
        
        this.categories.forEach(category => {
            if (category && category.id) {
                this.authService.getProductByCategory(category.id.toString()).subscribe({
                    next: (productsData) => {
                        let productsArray: any[] = [];
                        
                        // Handle different response formats for products
                        if (Array.isArray(productsData)) {
                            productsArray = productsData;
                        } else if (productsData && Array.isArray(productsData.results)) {
                            productsArray = productsData.results;
                        } else if (productsData && Array.isArray(productsData.data)) {
                            productsArray = productsData.data;
                        }
                        
                        this.categoryProductCounts[category.id] = productsArray.length;
                    },
                    error: (error) => {
                        console.error(`Error loading products for category ${category.id}:`, error);
                        this.categoryProductCounts[category.id] = 0;
                    }
                });
            }
        });
    }

    filterCategories() {
        if (!Array.isArray(this.categories)) {
            this.filteredCategories = [];
            return;
        }
        
        if (!this.searchTerm.trim()) {
            this.filteredCategories = [...this.categories];
        } else {
            this.filteredCategories = this.categories.filter(category =>
                category && category.name && category.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                category && category.description && category.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                category && category.slug && category.slug.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }
    }

    createCategory() {
        if (!this.category.name || !this.category.description) {
            this.error = 'Name and description are required';
            return;
        }

        this.loading = true;
        this.error = '';
        this.authService.createCategory(this.category).subscribe({
            next: (data) => {
                if (!Array.isArray(this.categories)) {
                    this.categories = [];
                }
                this.categories.push(data);
                this.filteredCategories = [...this.categories];
                this.categoryProductCounts[data.id] = 0; // New category has 0 products
                this.resetForm();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error creating category:', error);
                this.error = 'Failed to create category';
                this.loading = false;
            }
        });
    }

    updateCategory(categoryId: number) {
        this.loading = true;
        this.error = '';
        this.authService.updateCategory(categoryId, this.category).subscribe({
            next: (data) => {
                if (!Array.isArray(this.categories)) {
                    this.categories = [];
                }
                this.categories = this.categories.map((category) => 
                    category.id === categoryId ? data : category
                );
                this.filteredCategories = [...this.categories];
                this.resetForm();
                this.loading = false;
            },
            error: (error) => {
                console.error('Error updating category:', error);
                this.error = 'Failed to update category';
                this.loading = false;
            }
        });
    }

    deleteCategory(categoryId: number) {
        if (confirm('Are you sure you want to delete this category?')) {
            this.loading = true;
            this.error = '';
            this.authService.deleteCategory(categoryId).subscribe({
                next: () => {
                    if (!Array.isArray(this.categories)) {
                        this.categories = [];
                    }
                    this.categories = this.categories.filter(cat => cat.id !== categoryId);
                    this.filteredCategories = [...this.categories];
                    delete this.categoryProductCounts[categoryId]; // Remove product count for deleted category
                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error deleting category:', error);
                    this.error = 'Failed to delete category';
                    this.loading = false;
                }
            });
        }
    }

    editCategory(category: any) {
        this.category = { ...category };
    }

    resetForm() {
        this.category = {
            name: '',
            slug: '',
            description: '',
            parent: null
        };
    }

    // Method to refresh product counts (can be called manually if needed)
    refreshProductCounts() {
        this.loadProductCounts();
    }
}    
