// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.page').then(m => m.LoginPage),
    data: { title: 'Entrar — Conex3s' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.page').then(m => m.RegisterPage),
    data: { title: 'Criar conta' },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
    data: { title: 'Recuperar senha' },
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
