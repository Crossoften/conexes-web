// src/app/features/bank-reconciliation/bank-reconciliation.model.ts
export type ReconciliationTab = 'PENDING' | 'MOVEMENTS';

export interface BankAccountInfo {
  bankName: string;
  agency: string;
  account: string;
  balance: string;
}

export interface ConciliationSummary {
  title: string;
  credit: string;
  debit: string;
  // CB-01 / I058: quantidade de pendências também no card (existia só no seletor de contas).
  count?: number;
}

export interface MovementSubItem {
  id: string;
  descConexes: string;
  valConexes: string;
  descBank: string;
  valBank: string;
}

export interface MovementGroup {
  id: string;
  groupName: string; // Ex: "2 LANÇAMENTOS"
  totalValConexes: string;
  groupDescBank: string;
  totalValBank: string;
  conciliationType: string;
  subItems: MovementSubItem[];
}

export interface ReconciliationItem {
  id: string;
  date: string;
  dayOfWeek: string;
  description: string;
  amount: string;
  rawDate?: string | null; // ISO original — usado no filtro por período
  bankDetails?: BankAccountInfo; // Para a aba PENDENTES
  movementGroups?: MovementGroup[]; // Para a aba MOVIMENTAÇÕES
  // CB-03/CB-06/CB-13: dados crus da movimentação. O id da transação é o que
  // conciliar/ignorar precisam; o valor e o tipo alimentam os cards por período
  // (que antes somavam o total da conta, ignorando o filtro).
  txId?: number;
  rawValue?: number;
  type?: string;                 // 'Credit' | 'Debit'
  category?: string | null;
  stakeholderId?: number | null;
  costCenterId?: number | null;
  reconciled?: boolean;
}