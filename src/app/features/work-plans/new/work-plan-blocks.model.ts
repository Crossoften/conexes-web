// src/app/features/work-plans/new/work-plan-blocks.model.ts
//
// Registro de blocos do builder "Novo Plano de Trabalho". Cada bloco tem um tipo,
// título, descrição e a flag `unique` (só pode entrar uma vez no canvas).
// Blocos com arrays/tabelas (Metas, Financeiro, Monitoramento) e os Blocos Livres
// serão adicionados nos próximos sub-batches.

export type BlockType =
  | 'program'
  | 'celebrante'
  | 'responsible'
  | 'executada'
  | 'plan-data'
  | 'goals'
  | 'app-detailed'
  | 'app-summary'
  | 'disbursement'
  | 'team'
  | 'monitoring'
  | 'free-text'
  | 'free-table';

export interface BlockDef {
  type:        BlockType;
  title:       string;
  description: string;
  unique:      boolean;
}

export interface BlockGroup {
  label:  string;
  blocks: BlockDef[];
}

/** Instância de bloco ativa no canvas. */
export interface BlockInstance {
  uid:  number;
  type: BlockType;
}

export const BLOCK_GROUPS: BlockGroup[] = [
  {
    label: 'Dados Institucionais',
    blocks: [
      { type: 'program',     title: 'Dados do Programa',                       description: 'Número, órgão…',                     unique: true },
      { type: 'celebrante',  title: 'Dados e Informações da OSC Celebrante',   description: 'Informações da organização…',        unique: true },
      { type: 'responsible', title: 'Responsável por Acompanhar a Parceria',   description: 'Informações do responsável…',        unique: true },
      { type: 'executada',   title: 'Dados da OSC Executante e Não Celebrante', description: 'Informações da OSC executante…',     unique: true },
    ],
  },
  {
    label: 'Plano de Trabalho',
    blocks: [
      { type: 'plan-data', title: 'Dados do Plano de Trabalho',            description: 'Informações principais do plano…', unique: true },
      { type: 'goals',     title: 'Metas, Indicadores e Cronograma',       description: 'Uma meta com indicadores e etapas…', unique: false },
    ],
  },
  {
    label: 'Financeiro',
    blocks: [
      { type: 'app-detailed', title: 'Plano de Aplicação Detalhado', description: 'Itens de despesa detalhados…',       unique: true },
      { type: 'app-summary',  title: 'Plano de Aplicação – Resumo',  description: 'Resumo financeiro (calculado)…',      unique: true },
      { type: 'disbursement', title: 'Cronograma de Desembolso',     description: 'Parcelas de desembolso…',            unique: true },
    ],
  },
  {
    label: 'Equipe e Monitoramento',
    blocks: [
      { type: 'team',       title: 'Equipe de Trabalho',       description: 'Membros da equipe de execução…', unique: true },
      { type: 'monitoring', title: 'Monitoramento e Avaliação', description: 'Ações de monitoramento…',        unique: true },
    ],
  },
  {
    label: 'Blocos Livres',
    blocks: [
      { type: 'free-text',  title: 'Texto Livre',  description: 'Bloco de texto livre…',       unique: false },
      { type: 'free-table', title: 'Tabela Livre', description: 'Tabela personalizável…',       unique: false },
    ],
  },
];
