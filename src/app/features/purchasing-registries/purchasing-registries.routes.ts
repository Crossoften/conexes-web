// src/app/features/purchasing-registries/purchasing-registries.routes.ts
import { Routes } from '@angular/router';
import { PurchasingRegistriesListPage } from './purchasing-registries-list.page';
import { PurchasingRegistriesNewPage } from './new/purchasing-registries-new.page';


export const purchasingRegistriesRoutes: Routes = [
  {
    path: '',
    component: PurchasingRegistriesListPage
  },
  { path: 'new', component: PurchasingRegistriesNewPage }
];