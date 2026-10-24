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

/**
 * CP-10 / I077: uma parcela do título. A segunda visão do seletor mostra uma linha
 * por VENCIMENTO, e não uma por título — é o que a torna uma visão de conteúdo
 * próprio, e não a mesma tabela com outro rótulo.
 */
export interface PayableInstallment {
  numero: number;
  dueDate: string;
  value: string;
  paid: string;
  status: string;
  balanceNum: number;
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
  /** CP-10/I077: as parcelas do título, para a visão "Parcelas". */
  installments: PayableInstallment[];
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