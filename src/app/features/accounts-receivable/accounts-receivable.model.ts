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
  invoiceNumber: string;
  status: string;
}

export interface ReceivableFilters {
  status: string;
  dateRange: string;
  contractor: string;
  // Adicione outros campos específicos de contas a receber aqui
}