// src/app/features/taxes/taxes.routes.ts
import { Routes } from '@angular/router';
import { TaxesListPage } from './taxes-list.page';
import { TaxesNewPage } from './new/taxes-new.page';

export const taxesRoutes: Routes = [
  {
    path: '',
    component: TaxesListPage
  },
  {
    path: 'new',
    component: TaxesNewPage
  }
];