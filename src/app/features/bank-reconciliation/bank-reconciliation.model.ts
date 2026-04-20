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
  bankDetails?: BankAccountInfo; // Para a aba PENDENTES
  movementGroups?: MovementGroup[]; // Para a aba MOVIMENTAÇÕES
}