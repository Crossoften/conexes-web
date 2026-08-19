// src/app/features/integrations/integrations.routes.ts
import { Routes } from '@angular/router';

export const integrationsRoutes: Routes = [
  {
    path: 'fiscal-documents',
    loadComponent: () => import('./fiscal/fiscal-documents.page').then(m => m.FiscalDocumentsPage),
  },
  {
    path: 'bank-integrations',
    loadComponent: () => import('./payments/bank-integrations.page').then(m => m.BankIntegrationsPage),
  },
];
