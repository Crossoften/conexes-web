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

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon:  'dashboard',
  },
  {
    label: 'Gestão de cadastros',
    icon:  'registration',
    children: [
      { label: 'Stakeholders',          route: '/stakeholders' },
      { label: 'Plano de contas',       route: '/chart-of-accounts' },
      { label: 'Centro de custos',      route: '/cost-centers' },
      { label: 'Impostos e retenções',  route: '/taxes' },
      { label: 'Alçadas de aprovação',  route: '/approval-tiers' },
      { label: 'Cadastro de usuários',  route: '/users' },
      { label: 'Configurações gerais',  route: '/general-settings', disabled: true, badge: 'Em breve' },
    ],
  },
  {
    label: 'Entidades',
    icon:  'entities',
    children: [
      { label: 'Cadastro de entidades',        route: '/entity-registry' },
      { label: 'Contas bancárias e bancos',    route: '/bank-accounts' },
      { label: 'Colaboradores e dirigentes',   route: '/employees' },
      { label: 'Corpo diretivo',               route: '/positions' },
      // 'Anexos da entidade' oculto até a feature existir: a rota /entity-attachments está
      // comentada em app.routes e o Back ainda não tem o contrato (B-AN-01). Reativar quando pronto.
      // { label: 'Anexos da entidade',           route: '/entity-attachments' },
    ],
  },
  {
    label: 'Contratos e parcerias',
    icon:  'contracts',
    children: [
      { label: 'Cadastrar órgãos',       route: '/agencies' },
      { label: 'Plano de trabalho',      route: '/work-plans' },
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
      { label: 'Cadastros',     route: '/purchasing-registries' },
      { label: 'Relatórios',    route: '/purchasing-reports' },
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
      { label: 'Relatórios financeiros',       route: '/financial-reports' },
    ],
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
    label: 'Prestação de contas',
    route: '/accountability',
    icon:  'accountability',
  },
  {
    label: 'Perfil',
    route: '/profile',
    icon:  'profile',
  },
];
