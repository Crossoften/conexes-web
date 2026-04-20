// src/app/features/agencies/agencies.routes.ts
import { Routes } from '@angular/router';
import { AgenciesListPage } from './agencies-list.page';
import { AgencyNewPage } from './new/agency-new.page';

export const agenciesRoutes: Routes = [
  {
    path: '',
    component: AgenciesListPage
  },
  {
    path: 'new',
    component: AgencyNewPage
  }
];