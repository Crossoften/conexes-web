// src/app/features/financial-transfers/financial-transfers.routes.ts
import { Routes } from '@angular/router';
import { FinancialTransfersListPage } from './financial-transfers-list.page';
import { FinancialTransferNewPage } from './new/financial-transfer-new.page';
import { FinancialEntryNewPage } from './new-entry/financial-entry-new.page';

export const financialTransfersRoutes: Routes = [
  {
    path: '',
    component: FinancialTransfersListPage
  },
  {
    path: 'new',
    component: FinancialTransferNewPage
  },
  {
    path: 'new-entry',
    component: FinancialEntryNewPage
  },
  {
    // B5 (resto): edição do lançamento bancário. Mesmo formulário do cadastro,
    // carregando o registro e enviando PATCH.
    path: 'entry/:id/edit',
    component: FinancialEntryNewPage
  }
];