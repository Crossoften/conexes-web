// src/app/features/approval-tiers/approval-tiers.routes.ts
import { Routes } from '@angular/router';
import { ApprovalTiersListPage } from './approval-tiers-list.page';
import { ApprovalTiersNewPage } from './new/approval-tiers-new.page';

export const approvalTiersRoutes: Routes = [
  {
    path: '',
    component: ApprovalTiersListPage
  },
  {
    path: 'new',
    component: ApprovalTiersNewPage
  }
];