// src/app/features/users/users.routes.ts
import { Routes } from '@angular/router';
import { UsersListPage } from './users-list.page';
import { UserNewPage } from './new/user-new/user-new.page';
import { PermissionNewPage } from './new/permission-new/permission-new.page';

export const usersRoutes: Routes = [
  { path: '', component: UsersListPage },
  { path: 'new-user', component: UserNewPage },
  { path: 'new-permission', component: PermissionNewPage }
];