import { Routes } from '@angular/router';

export const accountabilityRoutes: Routes = [
  { path: '', loadComponent: () => import('./accountability-list.page').then(m => m.AccountabilityListPage) },
  { path: ':id', loadComponent: () => import('./accountability-detail.page').then(m => m.AccountabilityDetailPage) },
];
