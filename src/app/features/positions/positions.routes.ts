// src/app/features/positions/positions.routes.ts
import { Routes } from '@angular/router';
import { PositionsListPage } from './positions-list.page';
import { PositionsNewPage } from './new/positions-new.page'; 

export const positionsRoutes: Routes = [
  {
    path: '',
    component: PositionsListPage
  },
  {
    path: 'new',
    component: PositionsNewPage
  }
];