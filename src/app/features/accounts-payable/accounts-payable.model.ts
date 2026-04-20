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
}

export interface AdvancedFilters {
  issue: string;
  status: string;
  dateRange: string;
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