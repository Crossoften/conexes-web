// src/app/features/purchasing-orders/purchasing-orders.routes.ts
import { Routes } from '@angular/router';
import { PurchasingOrdersListPage } from './purchasing-orders-list.page';

export const purchasingOrdersRoutes: Routes = [
  {
    path: '',
    component: PurchasingOrdersListPage,
  },
];
