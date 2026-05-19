// src/app/features/chart-of-accounts/chart-of-accounts.model.ts

export type AccountStatus = 'Active' | 'Inactive';
export type AccountType   = 'T' | 'A' | 'S'; // Totalizadora, Analítica, Sintética

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Account {
  id:                 number;
  code:               string;
  title:              string;
  category:           string;
  categoryGroup:      string;
  categoryType:       string;
  accountType:        AccountType | string;
  budgetManagement:   boolean;
  description:        string;
  status:             AccountStatus;
  secondaryActivity:  string;
  creditProvision:    string;
  debitProvision:     string;
  creditWriteOff:     string;
  debitWriteOff:      string;
  parentId:           number | null;
  children?:          Account[];
  createdAt?:         string;
  updatedAt?:         string;
}

// ── Payload de criação / edição ───────────────────────────────────────────────

export interface AccountPayload {
  code:               string;
  title:              string;
  category:           string;
  categoryGroup:      string;
  categoryType:       string;
  accountType:        string;
  budgetManagement:   boolean;
  description:        string;
  status:             AccountStatus;
  secondaryActivity:  string;
  creditProvision:    string;
  debitProvision:     string;
  creditWriteOff:     string;
  debitWriteOff:      string;
  parentId:           number | null;
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const ACCOUNT_STATUS_CONFIG: Record<AccountStatus, StatusConfig> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  T: 'Totalizadora',
  A: 'Analítica',
  S: 'Sintética',
};
