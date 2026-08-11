import { Routes } from '@angular/router';

export const invoiceReviewRoutes: Routes = [
  { path: '', loadComponent: () => import('./invoice-review.page').then(m => m.InvoiceReviewPage) },
];
