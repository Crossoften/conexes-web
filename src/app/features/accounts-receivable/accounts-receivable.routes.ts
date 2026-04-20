// src/app/features/accounts-receivable/accounts-receivable.routes.ts
import { Routes } from '@angular/router';
import { AccountsReceivableListPage } from './accounts-receivable-list.page';

export const accountsReceivableRoutes: Routes = [
  {
    path: '',
    component: AccountsReceivableListPage
  }
];