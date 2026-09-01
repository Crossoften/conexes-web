// src/app/features/bank-accounts/bank-accounts.model.ts

export type BankAccountTab    = 'ACCOUNTS' | 'BANKS';
export type BankAccountType   = 'Checking' | 'Savings' | 'Salary' | 'Payment';
// O back passou a expor `status` nas CONTAS (não nos bancos).
export type BankAccountStatus = 'Active' | 'Pending' | 'Inactive';

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface BankAccount {
  id:             number;
  code?:          string;   // contas não têm `code` na resposta (bancos têm)
  nickname:       string;
  agency:         string;
  account:        string;
  accountType:    BankAccountType | string;
  status:         BankAccountStatus;
  initialBalance: number;
  openDate:       string;
  closeDate?:     string;   // nome do campo na resposta (era closingDate)
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

// CB-fix: opção do Plano de Contas usada no select "Conta contábil" (só contas analíticas).
export interface AccountPlanOption {
  id:           number;
  code:         string;
  title:        string;
  accountType?: string | null;
  children?:    AccountPlanOption[];
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface BankAccountPayload {
  entityId:          number;
  bankId:            number;
  agency:            string;
  account:           string;
  accountType:       BankAccountType;
  status?:           BankAccountStatus;
  nickname:          string;
  initialBalance:    number;
  openDate:          string;
  payingSourceId?:   number;   // opcional: se omitido, o back assume a entidade dona
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
  type?: string; // BCO-03: Publico | Privado
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

export const BANK_ACCOUNT_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Pending:  { label: 'Pendente', variant: 'neutral' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
};

export const BANK_ACCOUNT_STATUS_OPTIONS: { label: string; value: BankAccountStatus }[] = [
  { label: 'Ativo',    value: 'Active'   },
  { label: 'Pendente', value: 'Pending'  },
  { label: 'Inativo',  value: 'Inactive' },
];
