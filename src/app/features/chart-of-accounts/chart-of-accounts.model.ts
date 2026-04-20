// src/app/features/chart-of-accounts/chart-of-accounts.model.ts

export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type AccountType   = 'T' | 'A' | 'S'; // Totalizadora, Analítica, Sintética

export interface AccountChild {
  id:          string;
  title:       string;
  description: string;
  status:      AccountStatus;
}

export interface Account {
  id:          string;
  number:      string;
  title:       string;
  type:        AccountType;
  budgetMgmt:  string;
  description: string;
  status:      AccountStatus;
  children?:   AccountChild[];
}

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const ACCOUNT_STATUS_CONFIG: Record<AccountStatus, StatusConfig> = {
  ACTIVE:   { label: 'Ativo',   variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger'  },
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  T: 'T',
  A: 'A',
  S: 'S',
};
