import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const accessToken = localStorage.getItem('access_token');

  // Nếu có token, clone request và thêm header Authorization
  if (accessToken) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return next(cloned);
  }

  // Nếu không có token, gửi yêu cầu gốc
  return next(req);
};
