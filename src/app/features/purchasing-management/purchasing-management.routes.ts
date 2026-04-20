// src/app/features/purchasing-management/purchasing-management.routes.ts
import { Routes } from '@angular/router';
import { PurchasingManagementListPage } from './purchasing-management-list.page';
import { QuotationNewPage } from '../quotations/new/quotation-new.page';

export const purchasingManagementRoutes: Routes = [
  {
    path: '',
    component: PurchasingManagementListPage
  },
  {
    path: 'quotations/new',
    component: QuotationNewPage
  }
];