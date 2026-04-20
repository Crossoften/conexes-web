// src/app/features/profile/profile.routes.ts
import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./profile.page').then(m => m.ProfileComponent),
    data: { title: 'Perfil' },
  },
];
