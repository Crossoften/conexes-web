// src/app/layout/sidebar/nav.config.ts

export interface NavChild {
  label:     string;
  route:     string;
  disabled?: boolean;
  badge?:    string;
  // PERM-fix: override de permissão quando a rota é compartilhada por 2 menus
  // (ex.: Documentos fiscais/Notas fiscais usam a mesma rota, módulos diferentes).
  perm?:     { module: string; subMenu?: string };
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
      // TR-08: a tela existe — a preferência de descrição da transferência mora aqui.
      { label: 'Configurações gerais',  route: '/general-settings' },
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
      // COMP-21: "Mapa de cotação" saiu do menu. Não é um módulo próprio — é um
      // passo da Etapa 4, e se abre de lá, com a requisição já escolhida. A rota
      // continua existindo (/quotation-map/:requestId) para link antigo.
      { label: 'Gerenciamento', route: '/purchasing-management' },
      { label: 'Pedidos',       route: '/purchasing-orders' },
      { label: 'Recebimento',   route: '/purchase-receiving' },
      { label: 'Cadastros',     route: '/purchasing-registries' },
      // COM-Documentos / I029-I034 (decisão D3): a entrada INDEPENDENTE em Compras
      // saiu. A mesma rota aparecia em dois menus destacados — "Documentos fiscais"
      // aqui e "Notas fiscais e cobranças" no Financeiro —, e dois caminhos para a
      // mesma tela é justamente o que o item aponta. O acesso aos documentos
      // continua existindo no CONTEXTO: a nota de cada recebimento aparece dentro do
      // Pedido, e o Financeiro guarda a lista completa.
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
      // IT-03/IT-04/IT-06/IT-07: funções de Integrações realocadas para o Financeiro (o módulo isolado foi eliminado).
      { label: 'Notas fiscais e cobranças',    route: '/integrations/fiscal-documents', perm: { module: 'Financeiro' } },
      { label: 'Conexão bancária e extrato',   route: '/integrations/bank-integrations' },
      // HI-07: relatórios financeiros removidos do menu (Central de Relatórios futura).
    ],
  },
  {
    // Prestação de contas liberado nesta versão (mantém-se apenas Configurações gerais bloqueado).
    label: 'Prestação de contas',
    route: '/accountability',
    icon:  'accountability',
  },
  // IT-01/HI-05: o módulo individual "Integrações" foi ELIMINADO do menu (diretriz confirmada no
  // Dossiê Consolidado 24/08). Cada função migrou para o módulo dono do processo (Compras/Financeiro);
  // os parâmetros técnicos ficam em Configurações gerais (IT-02).
  {
    label: 'Perfil',
    route: '/profile',
    icon:  'profile',
  },
];

// HI-03: "Minha Organização" saiu do menu lateral e passou para a barra superior (topbar).
// "Corpo diretivo" deixou de ser item solto — virou uma aba dentro de "Colaboradores e dirigentes".
export const ORG_NAV_ITEM: NavItem = {
  label: 'Minha Organização',
  icon:  'entities',
  children: [
    { label: 'Cadastro da organização',    route: '/entity-registry' },
    { label: 'Contas bancárias e bancos',  route: '/bank-accounts' },
    { label: 'Colaboradores e dirigentes', route: '/employees' },
  ],
};
