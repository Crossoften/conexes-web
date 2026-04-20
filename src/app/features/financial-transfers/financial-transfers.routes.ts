// src/app/features/financial-transfers/financial-transfers.routes.ts
import { Routes } from '@angular/router';
import { FinancialTransfersListPage } from './financial-transfers-list.page';
import { FinancialTransferNewPage } from './new/financial-transfer-new.page';

export const financialTransfersRoutes: Routes = [
  {
    path: '',
    component: FinancialTransfersListPage
  },
  {
    path: 'new',
    component: FinancialTransferNewPage
  }
];