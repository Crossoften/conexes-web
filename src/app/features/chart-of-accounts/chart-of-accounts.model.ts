// src/app/features/chart-of-accounts/chart-of-accounts.model.ts

export type AccountStatus = 'Active' | 'Inactive';

// FE-PC-1: valores canônicos do back são SEM acento (Swagger).
// Tipo de Conta: Sintetica / Analitica
export type AccountType   = 'Sintetica' | 'Analitica';

// Tipo da Categoria: Entrada / Saida / Totalizadora
export type CategoryType  = 'Entrada' | 'Saida' | 'Totalizadora';

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

// Mapa de exibição do Tipo de Conta. Chaves = valores canônicos (sem acento) +
// variantes legadas já gravadas, para exibir rótulo amigável mesmo em dados antigos.
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  // canônico (back)
  Sintetica: 'Sintética',
  Analitica: 'Analítica',
  // acentuado (legado / display)
  'Sintética': 'Sintética',
  'Analítica': 'Analítica',
  // outras variantes legadas
  SINTETICA: 'Sintética',
  ANALITICA: 'Analítica',
  S: 'Sintética',
  A: 'Analítica',
  T: 'Totalizadora',
};

// FE-PC-1: rótulos do Tipo da Categoria (canônico sem acento + legado acentuado).
export const CATEGORY_TYPE_LABELS: Record<string, string> = {
  Entrada:      'Entrada',
  Saida:        'Saída',
  Totalizadora: 'Totalizadora',
  // legado acentuado
  'Saída':      'Saída',
};
