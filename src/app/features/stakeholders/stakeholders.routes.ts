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
  // Detalhe/edição é feito via modal na listagem (StakeholderDetailModalComponent);
  // não há página dedicada de detalhe por enquanto.
];
