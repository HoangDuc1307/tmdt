import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
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

// Import Admin Components
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { ListingsApprovalComponent } from './admin/listings-approval/listings-approval.component';
import { UsersManagementComponent } from './admin/users-management/users-management.component';
import { ReportsManagementComponent } from './admin/reports-management/reports-management.component';
import { FeesStatisticsComponent } from './admin/fees-statistics/fees-statistics.component';
import { UserDetailComponent } from './admin/users-management/user-details/user-details.component';

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
  
  // Admin routes (Flat format)
  { path: 'admin', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: 'admin/dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'admin/listings', component: ListingsApprovalComponent, canActivate: [adminGuard] },
  { path: 'admin/users', component: UsersManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/reports', component: ReportsManagementComponent, canActivate: [adminGuard] },
  { path: 'admin/fees', component: FeesStatisticsComponent, canActivate: [adminGuard] },
  { path: 'admin/users/:id', component: UserDetailComponent, canActivate: [adminGuard] },
];
