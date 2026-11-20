// src/app/features/budgets/budgets.model.ts
export type BudgetTab = 'BUDGETS' | 'PLANNING' | 'TRACKING';
export type BudgetStatus = 'ACTIVE' | 'INACTIVE';

/** F2/F3: uma linha do orçamento com previsto × realizado. */
export interface BudgetLine {
  itemId: number;
  descricao: string;
  /** Linha sem plano de contas, centro de custo nem projeto: não há como
   *  atribuir gasto a ela, então realiza zero e a tela precisa avisar. */
  semClassificacao: boolean;
  /** Card #768 (itens 63 e 64): a classificação na ordem da hierarquia. */
  categoria?: string | null;
  centroCusto?: string | null;
  projeto?: string | null;
  atividade?: string | null;
  previsto: number;
  realizado: number;
  comprometido?: number;
  saldoAposComprometido?: number;
  saldo: number;
  percentual: number;
  estourou: boolean;
}

/** F2/F3: o acompanhamento que o servidor devolve, já calculado. */
export interface BudgetTracking {
  previsto: number;
  realizado: number;
  saldo: number;
  percentual: number;
  estourou: boolean;
  periodo: { inicio: string | null; fim: string | null; semRecorte: boolean };
  linhas: BudgetLine[];
  naoClassificado: { titulos: number; valor: number };
}

export interface Budget {
  id: string;
  displayId: string;
  title: string;
  description: string;
  fiscalYear: string;
  periodicity: string;
  status: BudgetStatus;
  /** F2: quantas rubricas — era o que a coluna "Acompanhamento" mostrava. */
  rubricas: number;
  /** F2/F3: o acompanhamento de verdade. */
  tracking: BudgetTracking | null;
  /** Campos já formatados para a tabela. */
  previstoFmt: string;
  realizadoFmt: string;
  saldoFmt: string;
  percentual: number;
  estourou: boolean;
  periodoFmt: string;
  /** Card #768 (item 63): a vigência crua, para distribuir o previsto por período. */
  periodStart: string | null;
  periodEnd: string | null;
  launchType: string;
}

export const BUDGET_STATUS_CONFIG: Record<BudgetStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};