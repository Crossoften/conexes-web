// src/app/features/contract-transfers/contract-transfers.routes.ts
import { Routes } from '@angular/router';
import { ContractTransfersListPage } from './contract-transfers-list.page';
import { ContractTransferNewPage } from './new/contract-transfer-new.page'; 

export const contractTransfersRoutes: Routes = [
  {
    path: '',
    component: ContractTransfersListPage
  },
  {
    path: 'new',
    component: ContractTransferNewPage
  },
  {
    path: ':id/edit',
    component: ContractTransferNewPage
  },
  {
    path: ':id/view',
    component: ContractTransferNewPage,
    data: { view: true }
  }
];