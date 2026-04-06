import { Routes } from '@angular/router';
import { HomeComponent } from './page/home.component';
import { LoginComponent } from './page/login/login.component';
import { RegisterComponent } from './page/register/register.component';
import { ProductComponent } from './product/product.component';
import { CartItemComponent } from './oder/cart/cartItem.component';
import { CheckOutComponent } from './oder/checkout/checkout.component';
import { UserProfileComponent } from './user/userprofile/userprofile.component';
import { UserUpdateComponent } from './user/updateuser/userupdate.component';
import { PaidComponent } from './oder/paid/paid.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { MyProductsComponent } from './user/my-products/my-products.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'detail/:id', component: ProductComponent },
  { path: 'cart', component: CartItemComponent },
  { path: 'checkout', component: CheckOutComponent },
  { path: 'userprofile', component: UserProfileComponent },
  { path: 'userupdate', component: UserUpdateComponent },
  { path: 'paid', component: PaidComponent },
  { path: 'paid/:id', component: PaidComponent },
  { path: 'chatbot', component: ChatbotComponent },
  { path: 'my-products', component: MyProductsComponent },
  
  // User's admin pages
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'admin/listings', loadComponent: () => import('./pages/listings-approval/listings-approval.component').then(m => m.ListingsApprovalComponent) },
  { path: 'admin/users', loadComponent: () => import('./pages/users-management/users-management.component').then(m => m.UsersManagementComponent) },
  { path: 'admin/reports', loadComponent: () => import('./pages/reports-management/reports-management.component').then(m => m.ReportsManagementComponent) },
  { path: 'admin/fees', loadComponent: () => import('./pages/fees-statistics/fees-statistics.component').then(m => m.FeesStatisticsComponent) },
  { path: 'admin/users/:id', loadComponent: () => import('./pages/users-management/user-details/user-details.component').then(m => m.UserDetailComponent) },
];
