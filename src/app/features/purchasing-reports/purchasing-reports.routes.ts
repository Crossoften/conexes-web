// src/app/features/purchasing-reports/purchasing-reports.routes.ts
import { Routes } from '@angular/router';

export const purchasingReportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./purchasing-reports.page').then(m => m.PurchasingReportsPage),
    data: { title: 'Relatórios de compras' },
  },
];
