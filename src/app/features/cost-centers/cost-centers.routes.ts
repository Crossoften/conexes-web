// src/app/features/cost-centers/cost-centers.routes.ts
import { Routes } from '@angular/router';
import { CostCentersNewPage } from './new/cost-centers-new.page';

export const costCentersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cost-centers-list.page').then(m => m.CostCentersListPage),
    data: { title: 'Centro de Custos e Projetos' },
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./new/cost-centers-new.page').then(m => m.CostCentersNewPage),
    data: { title: 'Novo Centro de Custo ou Projeto' },
  }

];
