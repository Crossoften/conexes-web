// src/app/features/chart-of-accounts/chart-of-accounts.model.ts

export type AccountStatus = 'Active' | 'Inactive';

// Tipo de Conta (doc): Sintética / Analítica
export type AccountType   = 'Sintética' | 'Analítica';

// Tipo da Categoria (doc): Entrada / Saída / Totalizadora
export type CategoryType  = 'Entrada' | 'Saída' | 'Totalizadora';

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

// Mapa de exibição do Tipo de Conta. Inclui valores canônicos (doc) e
// variantes legadas já gravadas, para exibir rótulo amigável mesmo em dados antigos.
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  'Sintética': 'Sintética',
  'Analítica': 'Analítica',
  // legado
  SINTETICA: 'Sintética',
  ANALITICA: 'Analítica',
  S: 'Sintética',
  A: 'Analítica',
  T: 'Totalizadora',
};
