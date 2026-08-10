// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { PERMISSION_MODULES as M } from './core/auth/permission.model';

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
    canActivateChild: [permissionGuard],
    children: [
      { path: '', redirectTo: 'stakeholders', pathMatch: 'full' },

      // Gestão de cadastros 
      { path: 'stakeholders',         loadChildren: () => import('./features/stakeholders/stakeholders.routes').then(m => m.stakeholdersRoutes), data: { module: M.REGISTRATION } },
      { path: 'users',                loadChildren: () => import('./features/users/users.routes').then(m => m.usersRoutes), data: { module: M.REGISTRATION } },
      { path: 'approval-tiers',       loadChildren: () => import('./features/approval-tiers/approval-tiers.routes').then(m => m.approvalTiersRoutes), data: { module: M.REGISTRATION } },
      { path: 'taxes',                loadChildren: () => import('./features/taxes/taxes.routes').then(m => m.taxesRoutes), data: { module: M.REGISTRATION } },
      { path: 'cost-centers',         loadChildren: () => import('./features/cost-centers/cost-centers.routes').then(m => m.costCentersRoutes), data: { module: M.REGISTRATION } },
      { path: 'chart-of-accounts',    loadChildren: () => import('./features/chart-of-accounts/chart-of-accounts.routes').then(m => m.chartOfAccountsRoutes), data: { module: M.REGISTRATION } },
      // { path: 'general-settings',  loadChildren: () => import('./features/general-settings/general-settings.routes').then(m => m.generalSettingsRoutes) },

      // Entidades 
      { path: 'entity-registry',    loadChildren: () => import('./features/entity-registry/entity-registry.routes').then(m => m.entityRegistryRoutes), data: { module: M.ENTITIES } },
      { path: 'bank-accounts',      loadChildren: () => import('./features/bank-accounts/bank-accounts.routes').then(m => m.bankAccountsRoutes), data: { module: M.ENTITIES } },
      { path: 'employees',          loadChildren: () => import('./features/employees/employees.routes').then(m => m.employeesRoutes), data: { module: M.ENTITIES } },
      { path: 'positions',          loadChildren: () => import('./features/positions/positions.routes').then(m => m.positionsRoutes), data: { module: M.ENTITIES } },
      // { path: 'entity-attachments', loadChildren: () => import('./features/entity-attachments/entity-attachments.routes').then(m => m.entityAttachmentsRoutes) },
      // { path: 'board-members',      loadChildren: () => import('./features/board-members/board-members.routes').then(m => m.boardMembersRoutes) },

      // Contratos e parcerias 
      { path: 'agencies',           loadChildren: () => import('./features/agencies/agencies.routes').then(m => m.agenciesRoutes), data: { module: M.CONTRACTS } },
      { path: 'work-plans',         loadChildren: () => import('./features/work-plans/work-plans.routes').then(m => m.workPlansRoutes), data: { module: M.CONTRACTS } },
      { path: 'contract-transfers', loadChildren: () => import('./features/contract-transfers/contract-transfers.routes').then(m => m.contractTransfersRoutes), data: { module: M.CONTRACTS } },

      // Compras 
      { path: 'purchasing-dashboard', loadChildren: () => import('./features/purchasing-dashboard/purchasing-dashboard.routes').then(m => m.purchasingDashboardRoutes), data: { module: M.PURCHASING } },
      { path: 'quotations',           loadChildren: () => import('./features/quotations/quotations.routes').then(m => m.quotationsRoutes), data: { module: M.PURCHASING } },
      { path: 'purchasing-management', loadChildren: () => import('./features/purchasing-management/purchasing-management.routes').then(m => m.purchasingManagementRoutes), data: { module: M.PURCHASING } },
      { path: 'purchasing-orders',     loadChildren: () => import('./features/purchasing-orders/purchasing-orders.routes').then(m => m.purchasingOrdersRoutes), data: { module: M.PURCHASING } },
      { path: 'purchasing-registries', loadChildren: () => import('./features/purchasing-registries/purchasing-registries.routes').then(m => m.purchasingRegistriesRoutes), data: { module: M.PURCHASING } },
      // { path: 'purchasing-reports',    loadChildren: () => import('./features/purchasing-reports/purchasing-reports.routes').then(m => m.purchasingReportsRoutes) },

      // Financeiro 
      { path: 'financial-transfers',  loadChildren: () => import('./features/financial-transfers/financial-transfers.routes').then(m => m.financialTransfersRoutes), data: { module: M.FINANCIAL } },
      { path: 'bank-reconciliation',  loadChildren: () => import('./features/bank-reconciliation/bank-reconciliation.routes').then(m => m.bankReconciliationRoutes), data: { module: M.FINANCIAL } },
      { path: 'accounts-payable',     loadChildren: () => import('./features/accounts-payable/accounts-payable.routes').then(m => m.accountsPayableRoutes), data: { module: M.FINANCIAL } },
      { path: 'accounts-receivable',  loadChildren: () => import('./features/accounts-receivable/accounts-receivable.routes').then(m => m.accountsReceivableRoutes), data: { module: M.FINANCIAL } },
      { path: 'budgets',              loadChildren: () => import('./features/budgets/budgets.routes').then(m => m.budgetsRoutes), data: { module: M.FINANCIAL } },
      // { path: 'financial-reports',    loadChildren: () => import('./features/financial-reports/financial-reports.routes').then(m => m.financialReportsRoutes) },

      // Outros — a implementar
      // { path: 'dashboard',      loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes) },
      // { path: 'accountability', loadChildren: () => import('./features/accountability/accountability.routes').then(m => m.accountabilityRoutes) },
      // { path: 'profile',        loadChildren: () => import('./features/profile/profile.routes').then(m => m.profileRoutes) },
    ],
  },

  { path: '**', redirectTo: 'auth/login' },
];
