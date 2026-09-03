// src/app/layout/sidebar/permission-map.ts
//
// PERM-fix (Fase B): mapa ÚNICO rota → (module, subMenu) do Perfil de Permissão.
// É a fonte de verdade do filtro de MENU (sidebar). As rotas de negócio em
// app.routes.ts espelham este mapa via `data: { module, subMenu }` para o guard.
//
// Os nomes de module/subMenu são EXATOS ao catálogo do back
// (conexes-ws/src/modules/admin/user-management/user-management.service.ts →
// modulesCatalog()):
//   Cadastros            : Stakeholders, Órgãos Concessionários, Plano de Contas,
//                          Centro de Custo/Projeto/Atividade, Produtos e Serviços, Locais de Entrega
//   Compras              : Requisições, Cotações, Pedidos de Compra, Contratos, Alçadas de Aprovação
//   Financeiro           : Contas a Pagar, Contas a Receber, Bancos e Contas Bancárias, Orçamentos, Impostos e Retenções
//   Parcerias e Repasses : Parcerias, Planos de Trabalho
//   Institucional        : Entidades, Órgãos de Governança, Colaboradores
//   Usuários e Permissões: Usuários, Perfis de Permissão
//
// Regras:
//  • Rota AUSENTE deste mapa → visível a todos (ex.: Início, Perfil, Prestação de contas,
//    Documentos/Notas fiscais — tela compartilhada por Compras e Financeiro).
//  • subMenu ausente → checagem em nível de MÓDULO (telas-visão/gerais do módulo).
//  • Master ignora tudo (bypass no PermissionsService).

export interface RoutePermission {
  module:   string;
  subMenu?: string;
}

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // ── Cadastros e configurações ──────────────────────────────────────────────
  '/stakeholders':          { module: 'Cadastros', subMenu: 'Stakeholders' },
  '/chart-of-accounts':     { module: 'Cadastros', subMenu: 'Plano de Contas' },
  '/cost-centers':          { module: 'Cadastros', subMenu: 'Centro de Custo/Projeto/Atividade' },
  '/taxes':                 { module: 'Financeiro', subMenu: 'Impostos e Retenções' },
  '/users':                 { module: 'Usuários e Permissões', subMenu: 'Usuários' },
  '/approval-tiers':        { module: 'Compras', subMenu: 'Alçadas de Aprovação' },
  // '/general-settings' fica de fora: item desabilitado ("Em breve").

  // ── Minha Organização ──────────────────────────────────────────────────────
  '/entity-registry':       { module: 'Institucional', subMenu: 'Entidades' },
  '/bank-accounts':         { module: 'Financeiro', subMenu: 'Bancos e Contas Bancárias' },
  '/employees':             { module: 'Institucional', subMenu: 'Colaboradores' },
  '/positions':             { module: 'Institucional', subMenu: 'Órgãos de Governança' },

  // ── Convênios e parcerias ──────────────────────────────────────────────────
  '/agencies':              { module: 'Cadastros', subMenu: 'Órgãos Concessionários' },
  '/work-plans':            { module: 'Parcerias e Repasses', subMenu: 'Planos de Trabalho' },
  '/contract-transfers':    { module: 'Parcerias e Repasses', subMenu: 'Parcerias' },

  // ── Compras ────────────────────────────────────────────────────────────────
  '/purchasing-dashboard':  { module: 'Compras' },
  '/quotations':            { module: 'Compras', subMenu: 'Cotações' },
  '/quotation-map':         { module: 'Compras' },
  '/purchasing-management': { module: 'Compras' },
  '/purchasing-orders':     { module: 'Compras', subMenu: 'Pedidos de Compra' },
  '/purchase-receiving':    { module: 'Compras' },
  '/purchasing-registries': { module: 'Cadastros', subMenu: 'Produtos e Serviços' },

  // ── Financeiro ─────────────────────────────────────────────────────────────
  '/financial-transfers':   { module: 'Financeiro' },
  '/bank-reconciliation':   { module: 'Financeiro' },
  '/invoice-review':        { module: 'Financeiro' },
  '/accounts-payable':      { module: 'Financeiro', subMenu: 'Contas a Pagar' },
  '/accounts-receivable':   { module: 'Financeiro', subMenu: 'Contas a Receber' },
  '/budgets':               { module: 'Financeiro', subMenu: 'Orçamentos' },
  '/integrations/bank-integrations': { module: 'Financeiro' },
};

/** Resolve a permissão de uma rota do menu; null quando a rota é livre (sem mapeamento). */
export function resolveRoutePermission(route: string | undefined | null): RoutePermission | null {
  if (!route) return null;
  return ROUTE_PERMISSIONS[route] ?? null;
}
