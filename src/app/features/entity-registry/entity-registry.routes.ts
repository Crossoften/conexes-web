// src/app/features/entity-registry/entity-registry.routes.ts
import { Routes } from '@angular/router';
import { EntityRegistryListPage } from './entity-registry-list.page';
import { EntityRegistryNewPage } from './new/entity-registry-new.page';

export const entityRegistryRoutes: Routes = [
  {
    path: '',
    component: EntityRegistryListPage
  },
  {
    path: 'new',
    component: EntityRegistryNewPage,
  }
];