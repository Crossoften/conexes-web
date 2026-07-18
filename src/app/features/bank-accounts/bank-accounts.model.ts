// src/app/features/bank-accounts/bank-accounts.model.ts

// Obs.: `status` NÃO existe no contrato `/v1/institutional/bank-accounts` (nem no
// DTO nem na resposta documentada) — removido do front até o Back definir (B-BK-02).
export type BankAccountTab    = 'ACCOUNTS' | 'BANKS';
export type BankAccountType   = 'Checking' | 'Savings' | 'Salary' | 'Payment';

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface BankAccount {
  id:             number;
  code:           string;
  nickname:       string;
  agency:         string;
  account:        string;
  accountType:    BankAccountType | string;
  initialBalance: number;
  openDate:       string;
  closingDate?:   string;
  bankName?:      string;
  bankId:         number;
  entityId:       number;
  payingSourceId: number;
  phone:          string;
  cellPhone:      string;
  contactEmail:   string;
  contactName:    string;
  accountingAccount: string;
  resourceType:   string;
  isAccountHolderDataDifferent: boolean;
  convPaymentNumber: string;
  accountCnpj:    string;
  paymentInterval: string;
  cnabType:       string;
  hash:           string;
  paymentApi:     string;
  movementCode:   string;
  boletoSequential: number;
  beneficiaryCode: string;
  wallet:         string;
  convCollectionNumber: string;
  walletVariation: string;
  modality:       string;
}

export interface Bank {
  id:     number;
  code:   string;
  name:   string;
  type?:  string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface BankAccountPayload {
  entityId:          number;
  bankId:            number;
  agency:            string;
  account:           string;
  accountType:       BankAccountType;
  nickname:          string;
  initialBalance:    number;
  openDate:          string;
  payingSourceId:    number;
  phone:             string;
  cellPhone:         string;
  contactEmail:      string;
  contactName:       string;
  accountingAccount: string;
  resourceType:      string;
  isAccountHolderDataDifferent: boolean;
  convPaymentNumber: string;
  accountCnpj:       string;
  paymentInterval:   string;
  cnabType:          string;
  hash:              string;
  paymentApi:        string;
  movementCode:      string;
  boletoSequential:  number;
  beneficiaryCode:   string;
  wallet:            string;
  convCollectionNumber: string;
  walletVariation:   string;
  modality:          string;
}

// ── Payload de banco ─────────────────────────────────────────────────────────

export interface BankPayload {
  name: string;
  code: string;
}

// ── Resposta da listagem ──────────────────────────────────────────────────────

export interface BankAccountsListResponse {
  accounts: BankAccount[];
  banks:    Bank[];
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  Checking: 'Conta Corrente',
  Savings:  'Conta Poupança',
  Salary:   'Conta Salário',
  Payment:  'Conta Pagamento',
};
