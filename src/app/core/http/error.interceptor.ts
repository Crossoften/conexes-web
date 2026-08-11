// src/app/core/http/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth   = inject(AuthService);

  // Rotas públicas: um 401/erro aqui é resposta esperada da própria requisição
  // (login com senha errada, recuperação de senha) — NÃO deslogar nem navegar,
  // senão o router.navigate para a mesma URL sob withViewTransitions() congela o
  // frame (InvalidStateError) e engole o feedback de erro da tela. Deixa o erro
  // borbulhar para o componente exibir a mensagem.
  const isPublicAuthRoute = /\/v1\/login\b|\/no-auth\//.test(req.url);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicAuthRoute) {
        // SEG-001: limpa a sessão por COMPLETO (signal _user + token + user) e volta ao login;
        // antes só removia `auth_user`, deixando isAuthenticated() = true (o "voltar" repassava o guard).
        auth.logout();
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
