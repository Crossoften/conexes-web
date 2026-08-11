// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Gestão de cadastros 
      { path: 'stakeholders',         loadChildren: () => import('./features/stakeholders/stakeholders.routes').then(m => m.stakeholdersRoutes) },
      { path: 'users',                loadChildren: () => import('./features/users/users.routes').then(m => m.usersRoutes) },
      { path: 'approval-tiers',       loadChildren: () => import('./features/approval-tiers/approval-tiers.routes').then(m => m.approvalTiersRoutes) },
      { path: 'taxes',                loadChildren: () => import('./features/taxes/taxes.routes').then(m => m.taxesRoutes) },
      { path: 'cost-centers',         loadChildren: () => import('./features/cost-centers/cost-centers.routes').then(m => m.costCentersRoutes) },
      { path: 'chart-of-accounts',    loadChildren: () => import('./features/chart-of-accounts/chart-of-accounts.routes').then(m => m.chartOfAccountsRoutes) },
      // { path: 'general-settings',  loadChildren: () => import('./features/general-settings/general-settings.routes').then(m => m.generalSettingsRoutes) },

      // Entidades 
      { path: 'entity-registry',    loadChildren: () => import('./features/entity-registry/entity-registry.routes').then(m => m.entityRegistryRoutes) },
      { path: 'bank-accounts',      loadChildren: () => import('./features/bank-accounts/bank-accounts.routes').then(m => m.bankAccountsRoutes) },
      { path: 'employees',          loadChildren: () => import('./features/employees/employees.routes').then(m => m.employeesRoutes) },
      { path: 'positions',          loadChildren: () => import('./features/positions/positions.routes').then(m => m.positionsRoutes) },
      // { path: 'entity-attachments', loadChildren: () => import('./features/entity-attachments/entity-attachments.routes').then(m => m.entityAttachmentsRoutes) },
      // { path: 'board-members',      loadChildren: () => import('./features/board-members/board-members.routes').then(m => m.boardMembersRoutes) },

      // Contratos e parcerias 
      { path: 'agencies',           loadChildren: () => import('./features/agencies/agencies.routes').then(m => m.agenciesRoutes) },
      { path: 'work-plans',         loadChildren: () => import('./features/work-plans/work-plans.routes').then(m => m.workPlansRoutes) },
      { path: 'contract-transfers', loadChildren: () => import('./features/contract-transfers/contract-transfers.routes').then(m => m.contractTransfersRoutes) },

      // Compras 
      { path: 'purchasing-dashboard', loadChildren: () => import('./features/purchasing-dashboard/purchasing-dashboard.routes').then(m => m.purchasingDashboardRoutes) },
      { path: 'quotations',           loadChildren: () => import('./features/quotations/quotations.routes').then(m => m.quotationsRoutes) },
      { path: 'purchasing-management', loadChildren: () => import('./features/purchasing-management/purchasing-management.routes').then(m => m.purchasingManagementRoutes) },
      { path: 'purchasing-orders',     loadChildren: () => import('./features/purchasing-orders/purchasing-orders.routes').then(m => m.purchasingOrdersRoutes) },
      { path: 'purchasing-registries', loadChildren: () => import('./features/purchasing-registries/purchasing-registries.routes').then(m => m.purchasingRegistriesRoutes) },
      // { path: 'purchasing-reports',    loadChildren: () => import('./features/purchasing-reports/purchasing-reports.routes').then(m => m.purchasingReportsRoutes) },

      // Financeiro 
      { path: 'financial-transfers',  loadChildren: () => import('./features/financial-transfers/financial-transfers.routes').then(m => m.financialTransfersRoutes) },
      { path: 'bank-reconciliation',  loadChildren: () => import('./features/bank-reconciliation/bank-reconciliation.routes').then(m => m.bankReconciliationRoutes) },
      { path: 'accounts-payable',     loadChildren: () => import('./features/accounts-payable/accounts-payable.routes').then(m => m.accountsPayableRoutes) },
      { path: 'accounts-receivable',  loadChildren: () => import('./features/accounts-receivable/accounts-receivable.routes').then(m => m.accountsReceivableRoutes) },
      { path: 'budgets',              loadChildren: () => import('./features/budgets/budgets.routes').then(m => m.budgetsRoutes) },
      { path: 'invoice-review',       loadChildren: () => import('./features/invoice-review/invoice-review.routes').then(m => m.invoiceReviewRoutes) },
      // { path: 'financial-reports',    loadChildren: () => import('./features/financial-reports/financial-reports.routes').then(m => m.financialReportsRoutes) },

      // Outros
      { path: 'dashboard',      loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes) },
      { path: 'accountability', loadChildren: () => import('./features/accountability/accountability.routes').then(m => m.accountabilityRoutes) },
      { path: 'profile',        loadChildren: () => import('./features/profile/profile.routes').then(m => m.profileRoutes) },

      // Rota desconhecida com o usuário AUTENTICADO: mostra o 404 DENTRO do shell
      // (sidebar/topbar visíveis, sessão preservada) em vez de jogar para o login.
      { path: '**', loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage) },
    ],
  },

  // Rota desconhecida com o usuário DESLOGADO: cai no shell acima, o authGuard
  // redireciona para o login. Este ** é uma salvaguarda final.
  { path: '**', redirectTo: 'auth/login' },
];
