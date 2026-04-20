// src/app/features/stakeholders/stakeholders.routes.ts
import { Routes } from '@angular/router';

export const stakeholdersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./stakeholders-list.page').then(m => m.StakeholdersPage),
    data: { title: 'Stakeholders' },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./new/stakeholder-new.page').then(m => m.StakeholderNewPage),
    data: { title: 'Novo Stakeholder' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./stakeholder-detail.page').then(m => m.StakeholderDetailPage),
    data: { title: 'Detalhe do Stakeholder' },
  },
];
