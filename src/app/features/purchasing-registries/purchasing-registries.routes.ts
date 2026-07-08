// src/app/features/purchasing-registries/purchasing-registries.routes.ts
import { Routes } from '@angular/router';
import { PurchasingRegistriesListPage } from './purchasing-registries-list.page';
import { PurchasingRegistriesNewPage } from './new/purchasing-registries-new.page';
import { DeliveryLocationNewPage } from './new/delivery-location-new.page';

export const purchasingRegistriesRoutes: Routes = [
  { path: '', component: PurchasingRegistriesListPage },

  // Produtos e serviços
  { path: 'new',        component: PurchasingRegistriesNewPage },
  { path: 'edit/:id',   component: PurchasingRegistriesNewPage },

  // Locais de entrega
  { path: 'locations/new',      component: DeliveryLocationNewPage },
  { path: 'locations/edit/:id', component: DeliveryLocationNewPage },
];
