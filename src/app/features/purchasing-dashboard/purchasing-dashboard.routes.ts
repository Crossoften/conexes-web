// src/app/features/purchasing-dashboard/purchasing-dashboard.routes.ts
import { Routes } from '@angular/router';

export const purchasingDashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchasing-dashboard.page').then(m => m.PurchasingDashboardPage),
    data: { title: 'Dashboard' },
  },
];
