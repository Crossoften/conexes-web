// src/app/features/budgets/budgets.routes.ts
import { Routes } from '@angular/router';
import { BudgetsListPage } from './budgets-list.page';
import { BudgetNewPage } from './new/budget-new.page';  

export const budgetsRoutes: Routes = [
  {
    path: '',
    component: BudgetsListPage
  },
  {
    path: 'new',
    component: BudgetNewPage
  }
];