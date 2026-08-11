// src/app/features/transparency/transparency.routes.ts
import { Routes } from '@angular/router';

export const transparencyRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./transparency-list.page').then(m => m.TransparencyListPage),
    data: { title: 'Portal da Transparência' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./transparency-detail.page').then(m => m.TransparencyDetailPage),
    data: { title: 'Parceria — Transparência' },
  },
];
