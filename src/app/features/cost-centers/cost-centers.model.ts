// src/app/features/cost-centers/cost-centers.model.ts

export type CostCenterStatus = 'Active' | 'Inactive';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface LinkedAccount {
  origin:        string;
  accountPlanId: number;
}

export interface CostCenterChild {
  id:          number;
  code:        string;
  name:        string;
  description: string;
  status:      CostCenterStatus;
}

export interface CostCenterGroup {
  id:       number;
  code:     string;
  name:     string;
  children: CostCenterChild[];
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface CostCenter {
  id:                   number;
  code:                 string;
  name:                 string;   // centros de custo
  title?:               string;   // projetos retornam title
  type:                 string;
  description:          string;
  status:               CostCenterStatus;
  accountingCode:       string;
  payingSource:         string;
  startDate:            string;
  categoryDescription:  string;
  restrictInterestFine: boolean;
  restrictBudget:       boolean;
  costCenterId:         number | null;
  linkedAccounts:       LinkedAccount[];
  groups?:              CostCenterGroup[];
  createdAt?:           string;
  updatedAt?:           string;
}

// ── Payload de criação/edição ─────────────────────────────────────────────────

export interface CostCenterPayload {
  code:                 string;
  name:                 string;
  type:                 string;
  description:          string;
  status:               CostCenterStatus;
  accountingCode:       string;
  payingSource:         string;
  startDate:            string;
  categoryDescription:  string;
  restrictInterestFine: boolean;
  restrictBudget:       boolean;
  costCenterId:         number | null;
  linkedAccounts:       LinkedAccount[];
}

// ── Filtros para listagem server-side ─────────────────────────────────────────

export interface CostCenterListParams {
  name?: string;
  type?: string;
  skip?: number;
  take?: number;
}

// ── Resposta paginada da API ──────────────────────────────────────────────────

export interface CostCenterListResponse {
  data:  CostCenter[];
  total: number;
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

// ── Helper: deriva entityType a partir do campo type ─────────────────────────

export function toEntityType(type: string): 'cost_center' | 'project' {
  return type === 'centro_de_custo' ? 'cost_center' : 'project';
}