// src/app/features/bank-accounts/bank-accounts.model.ts
export type BankAccountStatus = 'ACTIVE' | 'INACTIVE';
export type BankAccountTab = 'ACCOUNTS' | 'BANKS';

export interface BankAccount {
  id: string;
  code: string;
  alias: string;
  agency: string;
  accountNumber: string;
  accountType: string;
  initialBalance: string;
  openingDate: string;
  closingDate?: string;
  bankName: string;
  status: BankAccountStatus;
}

export interface Bank {
  id: string;
  code: string;
  name: string;
  status: BankAccountStatus;
  type: string;
}

export const BANK_ACCOUNT_STATUS_CONFIG: Record<BankAccountStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};