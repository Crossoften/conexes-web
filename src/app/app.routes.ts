// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
// PERM-fix (Fase B): guarda por Perfil de Permissão. O `data: { module, subMenu }`
// de cada rota espelha layout/sidebar/permission-map.ts (nomes do modulesCatalog()).
import { permissionGuard } from './core/auth/permission.guard';

export const appRoutes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    // Portal da Transparência — público, sem login e FORA do shell (sem sidebar/topbar).
    path: 'transparencia',
    loadChildren: () =>
      import('./features/transparency/transparency.routes').then(m => m.transparencyRoutes),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Gestão de cadastros
      { path: 'stakeholders',         canActivate: [permissionGuard], data: { module: 'Cadastros', subMenu: 'Stakeholders' },                    loadChildren: () => import('./features/stakeholders/stakeholders.routes').then(m => m.stakeholdersRoutes) },
      { path: 'users',                canActivate: [permissionGuard], data: { module: 'Usuários e Permissões', subMenu: 'Usuários' },            loadChildren: () => import('./features/users/users.routes').then(m => m.usersRoutes) },
      { path: 'approval-tiers',       canActivate: [permissionGuard], data: { module: 'Compras', subMenu: 'Alçadas de Aprovação' },             loadChildren: () => import('./features/approval-tiers/approval-tiers.routes').then(m => m.approvalTiersRoutes) },
      { path: 'taxes',                canActivate: [permissionGuard], data: { module: 'Financeiro', subMenu: 'Impostos e Retenções' },          loadChildren: () => import('./features/taxes/taxes.routes').then(m => m.taxesRoutes) },
      { path: 'cost-centers',         canActivate: [permissionGuard], data: { module: 'Cadastros', subMenu: 'Centro de Custo/Projeto/Atividade' }, loadChildren: () => import('./features/cost-centers/cost-centers.routes').then(m => m.costCentersRoutes) },
      { path: 'chart-of-accounts',    canActivate: [permissionGuard], data: { module: 'Cadastros', subMenu: 'Plano de Contas' },                loadChildren: () => import('./features/chart-of-accounts/chart-of-accounts.routes').then(m => m.chartOfAccountsRoutes) },
      // { path: 'general-settings',  loadChildren: () => import('./features/general-settings/general-settings.routes').then(m => m.generalSettingsRoutes) },

      // Entidades
      { path: 'entity-registry',    canActivate: [permissionGuard], data: { module: 'Institucional', subMenu: 'Entidades' },                 loadChildren: () => import('./features/entity-registry/entity-registry.routes').then(m => m.entityRegistryRoutes) },
      { path: 'bank-accounts',      canActivate: [permissionGuard], data: { module: 'Financeiro', subMenu: 'Bancos e Contas Bancárias' },     loadChildren: () => import('./features/bank-accounts/bank-accounts.routes').then(m => m.bankAccountsRoutes) },
      { path: 'employees',          canActivate: [permissionGuard], data: { module: 'Institucional', subMenu: 'Colaboradores' },              loadChildren: () => import('./features/employees/employees.routes').then(m => m.employeesRoutes) },
      { path: 'positions',          canActivate: [permissionGuard], data: { module: 'Institucional', subMenu: 'Órgãos de Governança' },       loadChildren: () => import('./features/positions/positions.routes').then(m => m.positionsRoutes) },
      // { path: 'entity-attachments', loadChildren: () => import('./features/entity-attachments/entity-attachments.routes').then(m => m.entityAttachmentsRoutes) },
      // { path: 'board-members',      loadChildren: () => import('./features/board-members/board-members.routes').then(m => m.boardMembersRoutes) },

      // Contratos e parcerias
      { path: 'agencies',           canActivate: [permissionGuard], data: { module: 'Cadastros', subMenu: 'Órgãos Concessionários' },        loadChildren: () => import('./features/agencies/agencies.routes').then(m => m.agenciesRoutes) },
      { path: 'work-plans',         canActivate: [permissionGuard], data: { module: 'Parcerias e Repasses', subMenu: 'Planos de Trabalho' }, loadChildren: () => import('./features/work-plans/work-plans.routes').then(m => m.workPlansRoutes) },
      { path: 'contract-transfers', canActivate: [permissionGuard], data: { module: 'Parcerias e Repasses', subMenu: 'Parcerias' },          loadChildren: () => import('./features/contract-transfers/contract-transfers.routes').then(m => m.contractTransfersRoutes) },

      // Compras
      { path: 'purchasing-dashboard', canActivate: [permissionGuard], data: { module: 'Compras' },                              loadChildren: () => import('./features/purchasing-dashboard/purchasing-dashboard.routes').then(m => m.purchasingDashboardRoutes) },
      // HI-07: rota de relatórios de Compras removida do menu e do roteamento (Central de Relatórios futura).
      // { path: 'purchasing-reports', ... }
      { path: 'quotations',           canActivate: [permissionGuard], data: { module: 'Compras', subMenu: 'Cotações' },         loadChildren: () => import('./features/quotations/quotations.routes').then(m => m.quotationsRoutes) },
      { path: 'quotation-map',        canActivate: [permissionGuard], data: { module: 'Compras' },                              loadChildren: () => import('./features/quotation-map/quotation-map.routes').then(m => m.quotationMapRoutes) },
      { path: 'purchase-receiving',   canActivate: [permissionGuard], data: { module: 'Compras' },                              loadChildren: () => import('./features/purchase-receiving/purchase-receiving.routes').then(m => m.purchaseReceivingRoutes) },
      { path: 'purchasing-management', canActivate: [permissionGuard], data: { module: 'Compras' },                             loadChildren: () => import('./features/purchasing-management/purchasing-management.routes').then(m => m.purchasingManagementRoutes) },
      { path: 'purchasing-orders',     canActivate: [permissionGuard], data: { module: 'Compras', subMenu: 'Pedidos de Compra' }, loadChildren: () => import('./features/purchasing-orders/purchasing-orders.routes').then(m => m.purchasingOrdersRoutes) },
      { path: 'purchasing-registries', canActivate: [permissionGuard], data: { module: 'Cadastros', subMenu: 'Produtos e Serviços' }, loadChildren: () => import('./features/purchasing-registries/purchasing-registries.routes').then(m => m.purchasingRegistriesRoutes) },
      // { path: 'purchasing-reports',    loadChildren: () => import('./features/purchasing-reports/purchasing-reports.routes').then(m => m.purchasingReportsRoutes) },

      // Financeiro
      { path: 'financial-transfers',  canActivate: [permissionGuard], data: { module: 'Financeiro' },                          loadChildren: () => import('./features/financial-transfers/financial-transfers.routes').then(m => m.financialTransfersRoutes) },
      { path: 'bank-reconciliation',  canActivate: [permissionGuard], data: { module: 'Financeiro' },                          loadChildren: () => import('./features/bank-reconciliation/bank-reconciliation.routes').then(m => m.bankReconciliationRoutes) },
      { path: 'accounts-payable',     canActivate: [permissionGuard], data: { module: 'Financeiro', subMenu: 'Contas a Pagar' },   loadChildren: () => import('./features/accounts-payable/accounts-payable.routes').then(m => m.accountsPayableRoutes) },
      { path: 'accounts-receivable',  canActivate: [permissionGuard], data: { module: 'Financeiro', subMenu: 'Contas a Receber' }, loadChildren: () => import('./features/accounts-receivable/accounts-receivable.routes').then(m => m.accountsReceivableRoutes) },
      { path: 'budgets',              canActivate: [permissionGuard], data: { module: 'Financeiro', subMenu: 'Orçamentos' },       loadChildren: () => import('./features/budgets/budgets.routes').then(m => m.budgetsRoutes) },
      { path: 'invoice-review',       canActivate: [permissionGuard], data: { module: 'Financeiro' },                          loadChildren: () => import('./features/invoice-review/invoice-review.routes').then(m => m.invoiceReviewRoutes) },
      // HI-07: rota de relatórios financeiros removida do menu e do roteamento (Central de Relatórios futura).
      // { path: 'financial-reports', ... }
      { path: 'integrations',         loadChildren: () => import('./features/integrations/integrations.routes').then(m => m.integrationsRoutes) },

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
