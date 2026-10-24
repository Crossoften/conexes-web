// src/app/features/accounts-payable/accounts-payable.model.ts
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

export interface PayableAccount {
  id: string;
  displayId: string;
  type: string;
  document: string;
  company: string;
  history: string;
  registrationDate: string;
  issueDate: string;
  dueDate: string;
  value: string;
  status: string;
  // FIN-01: baixa parcial
  rawStatus: string;
  balance: string;
  balanceNum: number;
  canPay: boolean;
}

export interface AdvancedFilters {
  /** CP-01: sobre qual data o intervalo De–Até incide (o antigo select "Emissão"). */
  issue: string;
  status: string;
  /** CP-01: o campo único "De - Ate" virou um par de datas de verdade. */
  dateStart: string;
  dateEnd: string;
  supplier: string;
  remittanceStatus: string;
  expenseType: string;
  paymentType: string;
  contract: string;
  requisition: string;
  writeOffAccount: string;
  payingAccount: string;
  categoryAccount: string;
  costCenter: string;
  subProject: string;
}

/** Uma opção de select do filtro. */
export interface FilterOption { value: string; label: string }