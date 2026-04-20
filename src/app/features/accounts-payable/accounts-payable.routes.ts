import { Routes } from '@angular/router';
import { AccountsPayableListPage } from './accounts-payable-list.page'; 
import { AccountsPayableNewPage } from './new/accounts-payable-new.page';

export const accountsPayableRoutes: Routes = [
  {
    path: '',
    component: AccountsPayableListPage
  },
  {
    path: 'new',
    component: AccountsPayableNewPage
  }
];