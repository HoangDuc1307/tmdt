
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../component/sidebar/sidebar';
import { HeaderAdminComponent } from '../../component/header-admin/header-admin.component';
import { AuthService } from '../../api/auth.service';


@Component({
  selector: 'app-userlist',
  standalone: true,
  imports:[CommonModule, FormsModule, RouterModule, SidebarComponent, HeaderAdminComponent],
  templateUrl:'userlist.component.html',
  styleUrls: ['./userlist.component.css'],
  

})
export class UserListComponent {
  profile: any[] =[];
  error: string = '';
  
  constructor(private authService: AuthService) {
    this.loadUserProfile();
  }

  loadUserProfile(){
    this.authService.getAllUserProfile().subscribe({
      next: (data) =>{
        this.profile = Array.isArray(data) ? data : (data.results || []);
        console.log('User profile data:', this.profile); // Thêm dòng này
      },
      error: (err) => {
        this.error = err.error?.detail || 'Không thể lấy danh sách user';
      }
    })
  }
}
