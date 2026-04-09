import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { HomeComponent } from './page/home.component';
import { LoginComponent } from './page/login/login.component';
import { RegisterComponent } from './page/register/register.component';
import { ResetPasswordComponent } from './page/reset-password/reset-password.component';
import { ProductComponent } from './product/product.component';
import { ProductManageComponent } from './seller/product-manage/product-manage.component';
import { AddProductComponent } from './seller/product-manage/add-product/add_product.component';
import { UpdateProductComponent } from './seller/product-manage/update-product/update_product.component';
import { OrderListComponent } from './seller/oder/orderlist/orderlist.component';
import { CartItemComponent } from './oder/cart/cartItem.component';
import { CheckOutComponent } from './oder/checkout/checkout.component';
import { UserProfileComponent } from './user/userprofile/userprofile.component';
import { UserUpdateComponent } from './user/updateuser/userupdate.component';
import { PaidComponent } from './oder/paid/paid.component';
import { UserListComponent } from './seller/userlist/userlist.component';
import { OderDetailComponent } from './seller/oder/orderdetail/orderdetail.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { CategoryComponent } from './seller/product-manage/category/category.component';
import { DashBoardComponent } from './seller/dashboard/dashboard.component';
import { ChatManageComponent } from './seller/chatmanage/chatmanage.component';
import { MyProductsComponent } from './user/my-products/my-products.component';
import { AuthService } from './api/auth.service';
import { AdminShellComponent } from './admin/components/admin-shell/admin-shell.component';
import { DashboardComponent } from './admin/pages/dashboard/dashboard.component';
import { ListingsApprovalComponent } from './admin/pages/listings-approval/listings-approval.component';
import { UsersManagementComponent } from './admin/pages/users-management/users-management.component';
import { ReportsManagementComponent } from './admin/pages/reports-management/reports-management.component';
import { FeesStatisticsComponent } from './admin/pages/fees-statistics/fees-statistics.component';
import { UserDetailComponent } from './admin/pages/users-management/user-details/user-details.component';
import { ShipperComponent } from './shipper/shipper.component';

const adminSystemGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAdmin() ? true : router.createUrlTree(['/login']);
};


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'detail/:id', component: ProductComponent },
  { path: 'seller/manage', component: ProductManageComponent },
  { path: 'add_product', component: AddProductComponent },
  { path: 'update_product/:id', component: UpdateProductComponent },
  { path: 'cart', component: CartItemComponent },
  { path: 'orderList', component: OrderListComponent },
  { path: 'checkout', component: CheckOutComponent },
  { path: 'userprofile', component: UserProfileComponent },
  { path: 'userupdate', component: UserUpdateComponent },
  { path: 'paid', component: PaidComponent },
  { path: 'paid/:id', component: PaidComponent },
  { path: 'userlist', component: UserListComponent },
  { path: 'orderdetail/:id', component: OderDetailComponent },
  { path: 'chatbot', component: ChatbotComponent },
  { path: 'category', component: CategoryComponent },
  { path: 'dashboard', component: DashBoardComponent },
  { path: 'chatmanage', component: ChatManageComponent },
  { path: 'my-products', component: MyProductsComponent },
  {path: 'shipper', component: ShipperComponent },

  // Admin system shell + child pages (same UX as admin-fe)
  {
    path: 'admin',
    canActivate: [adminSystemGuard],
    component: AdminShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'listings', component: ListingsApprovalComponent },
      { path: 'users', component: UsersManagementComponent },
      { path: 'reports', component: ReportsManagementComponent },
      { path: 'fees', component: FeesStatisticsComponent },
      { path: 'users/:id', component: UserDetailComponent },
    ],
  },
];
