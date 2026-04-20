// src/app/features/chart-of-accounts/chart-of-accounts.routes.ts
import { Routes } from '@angular/router';
import { ChartOfAccountsNewPage } from './new/chart-of-accounts-new.page';

export const chartOfAccountsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./chart-of-accounts-list.page').then(m => m.ChartOfAccountsListPage),
    data: { title: 'Plano de Contas' },
  },
  {
    path: 'new',
    component: ChartOfAccountsNewPage,
    data: { title: 'Novo Plano de Contas' }
  }
];
