// src/app/features/quotations/quotations.routes.ts
import { Routes } from '@angular/router';
import { QuotationNewPage } from './new/quotation-new.page';

export const quotationsRoutes: Routes = [
  {
    // Shell com a barra de etapas
    path: '',
    loadComponent: () =>
      import('./quotations-shell.page').then(m => m.QuotationsShellPage),
    children: [
      { path: '', redirectTo: 'stage-1', pathMatch: 'full' },
      {
        path: 'stage-1',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Envio de requisição', stage: 0 },
      },
      {
        path: 'stage-2',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Requisições em aprovação', stage: 1 },
      },
      {
        path: 'stage-3',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Requisições aprovadas/cotação', stage: 2 },
      },
      {
        path: 'stage-4',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Cotações em aprovação', stage: 3 },
      },
      {
        path: 'stage-5',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Compras aprovadas', stage: 4 },
      },
      {
        path: 'stage-6',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Pedidos finalizados', stage: 5 },
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./quotations-list.page').then(m => m.QuotationsListPage),
        data: { title: 'Todas as requisições', stage: 6 },
      },
    ],
  },
  { path: 'new', component: QuotationNewPage }
];
