// src/app/features/bank-accounts/bank-accounts.routes.ts
import { Routes } from '@angular/router';
import { BankAccountsListPage } from './bank-accounts-list.page';
import { BankAccountNewPage } from './new/bank-account-new.page';


export const bankAccountsRoutes: Routes = [
  {
    path: '',
    component: BankAccountsListPage
  },
  {
    path: 'new',
    component: BankAccountNewPage
  }
];