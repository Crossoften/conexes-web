// src/app/core/http/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem('auth_user');
        router.navigate(['/auth/login']);
      }
      // 403 de navegação (GET) → manda para a home; 403 de ação (POST/PATCH/DELETE)
      // borbulha para quem chamou tratar (ex.: aprovar sem alçada mostra o toast).
      if (error.status === 403 && req.method === 'GET') {
        router.navigate(['/']);
      }
      return throwError(() => error);
    }),
  );
};
