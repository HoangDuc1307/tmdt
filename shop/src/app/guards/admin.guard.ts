import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../api/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Nếu là admin (có quyền is_staff), cho phép truy cập
  if (authService.isAdmin()) {
    return true;
  }

  // Nếu không phải admin, chuyển hướng về trang login và trả về false
  router.navigate(['/login']);
  return false;
};
