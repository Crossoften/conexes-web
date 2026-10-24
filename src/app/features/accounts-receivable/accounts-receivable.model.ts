// src/app/features/accounts-receivable/accounts-receivable.model.ts
export interface SummaryCard {
  title: string;
  credit?: string;
  debit?: string;
  balance?: string;
  isAccountInfo?: boolean;
  bankName?: string;
  agency?: string;
  account?: string;
}

export interface ReceivableAccount {
  id: string;
  code: string;
  contractorDoc: string;
  contractorName: string;
  issueDate: string;
  /** CR-01: a coluna de vencimento faltava — a API devolvia e a tela descartava. */
  dueDate: string;
  invoiceNumber: string;
  status: string;
  // FIN-01: baixa (recebimento) parcial
  value: string;
  rawStatus: string;
  balance: string;
  balanceNum: number;
  canReceive: boolean;
  /** E2: quantas parcelas o título já tem, para a tela saber o que oferecer. */
  installmentsCount: number;
}

export interface ReceivableFilters {
  status: string;
  /** CR-01: sobre qual data o intervalo incide (o par de pagar, CP-01). */
  dateField: string;
  /** CR-01: "Período" era um texto livre que nunca chegava ao servidor. */
  dateStart: string;
  dateEnd: string;
  contractor: string;
}

/** Uma opção de select do filtro. */
export interface FilterOption { value: string; label: string }