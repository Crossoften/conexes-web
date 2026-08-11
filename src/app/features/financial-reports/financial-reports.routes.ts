// src/app/features/financial-reports/financial-reports.routes.ts
import { Routes } from '@angular/router';

export const financialReportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./financial-reports.page').then(m => m.FinancialReportsPage),
    data: { title: 'Relatórios financeiros' },
  },
];
