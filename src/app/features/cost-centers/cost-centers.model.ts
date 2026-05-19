// src/app/features/cost-centers/cost-centers.model.ts

export type CostCenterStatus = 'Active' | 'Inactive';
export type CostCenterType   = 'T' | 'A' | 'S';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface LinkedAccount {
  origin:       string;
  accountPlanId: number;
}

export interface CostCenterChild {
  id:          number;
  code:        string;
  title:       string;
  description: string;
  status:      CostCenterStatus;
}

export interface CostCenterGroup {
  id:       number;
  code:     string;
  title:    string;
  children: CostCenterChild[];
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface CostCenter {
  id:                  number;
  code:                string;
  title:               string;
  type:                string;
  description:         string;
  status:              CostCenterStatus;
  accountingCode:      string;
  payingSource:        string;
  startDate:           string;
  categoryDescription: string;
  restrictInterestFine: boolean;
  restrictBudget:      boolean;
  costCenterId:        number | null;
  linkedAccounts:      LinkedAccount[];
  groups?:             CostCenterGroup[];
  createdAt?:          string;
  updatedAt?:          string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface CostCenterPayload {
  code:                string;
  title:               string;
  type:                string;
  description:         string;
  status:              CostCenterStatus;
  accountingCode:      string;
  payingSource:        string;
  startDate:           string;
  categoryDescription: string;
  restrictInterestFine: boolean;
  restrictBudget:      boolean;
  costCenterId:        number | null;
  linkedAccounts:      LinkedAccount[];
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const COST_CENTER_STATUS_CONFIG: Record<CostCenterStatus, StatusConfig> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};
