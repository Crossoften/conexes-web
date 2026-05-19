import { Routes } from '@angular/router';
import { EntityRegistryListPage } from './entity-registry-list.page';
import { EntityRegistryNewPage } from './new/entity-registry-new.page';
import { EntityRegistryStore } from './entity-registry.store';

export const entityRegistryRoutes: Routes = [
  {
    path: '',
    providers: [EntityRegistryStore],
    children: [
      { path: '', component: EntityRegistryListPage },
      { path: 'new', component: EntityRegistryNewPage }
    ]
  }
];