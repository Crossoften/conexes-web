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
  },
  {
    // CP-04: edição do título. Reusa o mesmo formulário do cadastro, que carrega
    // o registro e envia PATCH em vez de POST.
    path: ':id/edit',
    component: AccountsPayableNewPage
  }
];