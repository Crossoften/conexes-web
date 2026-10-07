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
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage),
    data: { title: 'Recuperar senha' },
  },
  {
    path: 'invite',
    loadComponent: () =>
      import('./invite/invite.page').then(m => m.InvitePage),
    data: { title: 'Concluir cadastro — Conex3s' },
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Cadastro é feito pelo gerencial (admin): qualquer rota antiga de auth volta pro login.
  { path: '**', redirectTo: 'login' },
];
