// src/app/layout/sidebar/nav.config.ts

export interface NavChild {
  label:     string;
  route:     string;
  disabled?: boolean;
  badge?:    string;
}

export interface NavItem {
  label:     string;
  route?:    string;
  icon:      string;
  children?: NavChild[];
  disabled?: boolean;
  badge?:    string;
}

// v16 H-01..H-06: nomenclatura e agrupamento do menu principal.
//  H-01 Dashboard -> Início   · H-02 Stakeholders -> Contatos
//  H-03 Entidades -> "Minha Organização" (Cadastro da organização + Contas bancárias + Colaboradores)
//  H-04 "Contratos e parcerias" -> "Convênios e parcerias"
//  H-05 "Gestão de cadastros" -> "Cadastros e configurações" (Contatos, Plano de contas, Centros de custos,
//       Tributos e retenções, Usuários e permissões, Alçadas)
//  H-06 "Integrações" movido para depois de "Prestação de contas".
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Início',
    route: '/dashboard',
    icon:  'dashboard',
  },
  {
    label: 'Cadastros e configurações',
    icon:  'registration',
    children: [
      { label: 'Contatos',              route: '/stakeholders' },
      { label: 'Plano de contas',       route: '/chart-of-accounts' },
      { label: 'Centros de custos',     route: '/cost-centers' },
      { label: 'Tributos e retenções',  route: '/taxes' },
      { label: 'Usuários e permissões', route: '/users' },
      { label: 'Alçadas de aprovação',  route: '/approval-tiers' },
      { label: 'Configurações gerais',  route: '/general-settings', disabled: true, badge: 'Em breve' },
    ],
  },
  {
    label: 'Minha Organização',
    icon:  'entities',
    children: [
      { label: 'Cadastro da organização',      route: '/entity-registry' },
      { label: 'Contas bancárias e bancos',    route: '/bank-accounts' },
      { label: 'Colaboradores e dirigentes',   route: '/employees' },
      { label: 'Corpo diretivo',               route: '/positions' },
    ],
  },
  {
    label: 'Convênios e parcerias',
    icon:  'contracts',
    children: [
      { label: 'Cadastrar órgãos',       route: '/agencies' },
      { label: 'Plano de trabalho',      route: '/work-plans', disabled: true, badge: 'Em breve' },
      { label: 'Repasses e informações', route: '/contract-transfers' },
    ],
  },
  {
    label: 'Compras',
    icon:  'purchasing',
    children: [
      { label: 'Dashboard',     route: '/purchasing-dashboard' },
      { label: 'Cotações',      route: '/quotations' },
      { label: 'Mapa de cotação', route: '/quotation-map' },
      { label: 'Gerenciamento', route: '/purchasing-management' },
      { label: 'Pedidos',       route: '/purchasing-orders' },
      { label: 'Recebimento',   route: '/purchase-receiving' },
      { label: 'Cadastros',     route: '/purchasing-registries' },
      // HI-07: telas de relatórios removidas de todos os módulos (haverá uma Central de Relatórios futura).
    ],
  },
  {
    label: 'Financeiro',
    icon:  'financial',
    children: [
      { label: 'Transferências e lançamentos', route: '/financial-transfers' },
      { label: 'Conciliação bancária',         route: '/bank-reconciliation' },
      { label: 'Análise de notas',             route: '/invoice-review' },
      { label: 'Contas a pagar',               route: '/accounts-payable' },
      { label: 'Contas a receber',             route: '/accounts-receivable' },
      { label: 'Orçamentos',                   route: '/budgets' },
      // HI-07: relatórios financeiros removidos do menu (Central de Relatórios futura).
    ],
  },
  {
    // PR-01: módulo bloqueado com "Em breve" até o cliente enviar as orientações.
    label: 'Prestação de contas',
    route: '/accountability',
    icon:  'accountability',
    disabled: true,
    badge: 'Em breve',
  },
  {
    label: 'Integrações',
    icon:  'financial',
    children: [
      { label: 'Notas fiscais (NFe.io)',   route: '/integrations/fiscal-documents' },
      { label: 'Pagamentos e extrato',     route: '/integrations/bank-integrations' },
    ],
  },
  {
    label: 'Perfil',
    route: '/profile',
    icon:  'profile',
  },
];
