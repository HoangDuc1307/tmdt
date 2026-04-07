import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../component/sidebar/sidebar';
import { AuthService } from '../../../api/auth.service';

@Component({
  selector: 'app-update_product',
  imports:[RouterOutlet,FormsModule,RouterModule,CommonModule,SidebarComponent],
  templateUrl: './update_product.component.html',
  styleUrls: ['./update_product.component.css'],
  standalone: true,
})
export class UpdateProductComponent implements OnInit {

    product = {
      name: '',
      description: '',
      price: '',
      quantity: '',
      image: ''
    };
    message = '';
    error = '';
    adminToken: string | null = null;
    adminInfo: any = null;
    
    
  
    constructor(private authService: AuthService,private route:ActivatedRoute) {}
  
    ngOnInit() {
      this.adminToken = localStorage.getItem('authToken');
      const userInfo = localStorage.getItem('userInfo');
      this.adminInfo = userInfo ? JSON.parse(userInfo) : null;
      console.log('Admin token:', this.adminToken);
      console.log('Admin info:', this.adminInfo);
      const id = this.route.snapshot.paramMap.get('id');
      if(id){
        const id = this.route.snapshot.paramMap.get('id');
        if(id){
            this.authService.getProductById(id).subscribe({
                next: ( data: any ) => {
                    this.product = data;
                },
                error:(err:any) =>{
                  
                }
            })
        }
      }
    }
  
    onSubmit() {
      this.message = '';
      this.error = '';
      // Ép kiểu dữ liệu cho price và quantity
      const productData = {
        ...this.product,
        price: parseFloat(this.product.price),
        quantity: parseInt(this.product.quantity as any, 10)
      };
      this.authService.updateProduct(productData).subscribe({
        next: (res) => {
          this.message = 'Cập nhật sản phẩm thành công!';
          // Có thể chuyển hướng hoặc reset form nếu muốn
        },
        error: (err) => {
          this.error = 'Cập nhật sản phẩm thất bại!';
          console.error(err);
        }
      });
    }
  }