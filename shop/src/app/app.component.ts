import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { LoginComponent } from './page/login/login.component';
import { AuthService } from './api/auth.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './component/header/header.component';
import { FooterComponent } from './component/footer/footer.component';
import { HomeComponent } from './page/home.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { SidebarComponent } from './components/sidebar/sidebar';
import { HeaderAdminComponent } from './components/header-admin/header-admin.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginComponent, CommonModule, HeaderComponent, FooterComponent, ChatbotComponent, SidebarComponent, HeaderAdminComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  [x: string]: any;
  constructor(public router: Router, private authService: AuthService) {}

  isAdminRoute() {
    if (!this.authService.isAdmin() && this.authService.isLoggedIn()) {
       // Regular users should not see admin wrapper even if they happen to visit an admin route
       return false;
    }
    return this.router.url.startsWith('/admin') || this.router.url.startsWith('/pages/') || this.router.url.startsWith('/add_product') || this.router.url.startsWith('/update_product') || this.router.url.startsWith('/orderList') || this.router.url.startsWith('/userlist') || this.router.url.startsWith('/orderdetail') || this.router.url.startsWith('/dashboard') || this.router.url.startsWith('/category') || this.router.url.startsWith('/chatmanage');
  }
}
