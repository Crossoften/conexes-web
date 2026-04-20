// src/app/features/cost-centers/cost-centers.model.ts

export type CostCenterStatus = 'ACTIVE' | 'INACTIVE';
export type CostCenterType   = 'T' | 'A' | 'S';

export interface CostCenterChild {
  id:          string;
  code:        string;
  title:       string;
  description: string;
  status:      CostCenterStatus;
}

export interface CostCenterGroup {
  id:       string;
  code:     string;
  title:    string;
  children: CostCenterChild[];
}

export interface CostCenter {
  id:          string;
  number:      string;
  title:       string;
  type:        CostCenterType;
  budgetMgmt:  string;
  description: string;
  status:      CostCenterStatus;
  groups?:     CostCenterGroup[];
}

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const COST_CENTER_STATUS_CONFIG: Record<CostCenterStatus, StatusConfig> = {
  ACTIVE:   { label: 'Ativo',   variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger'  },
};
