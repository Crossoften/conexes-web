// src/app/features/taxes/taxes.model.ts

export type TaxStatus = 'Active' | 'Inactive' | 'Pending';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface TaxService {
  name:           string;
  description:    string;
  externalCode:   string;
  grantorOrgan:   string;
  hasRetention:   boolean;
  accessorOrgan:  string;
  concessionLink: string;
  costCenterId:   number | null;
  projectId:      number | null;
  activityId:     number | null;   // Atividade (3º nível) vinculada, além do Projeto
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Tax {
  id:              number;
  stakeholderId:   number;
  serviceClassCode: string;
  serviceTitle:    string;
  operationNature: string;
  totalRetentions: number;
  manualAliquots:  boolean;
  irfAliquot:      number;
  irfCode:         string;
  pisAliquot:      number;
  pisCode:         string;
  pccAliquot:      number;
  pccCode:         string;
  cofinsAliquot:   number;
  cofinsCode:      string;
  inssAliquot:     number;
  inssCode:        string;
  csllAliquot:     number;
  csllCode:        string;
  issAliquot:      number;
  issCode:         string;
  ibsAliquot:      number;
  ibsCode:         string;
  cbsAliquot:      number;
  cbsCode:         string;
  services:        TaxService[];
  status?:         TaxStatus;
  createdAt?:      string;
  updatedAt?:      string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface TaxPayload {
  stakeholderId:   number;
  serviceClassCode: string;
  serviceTitle:    string;
  operationNature: string;
  totalRetentions: number;
  manualAliquots:  boolean;
  irfAliquot:      number;
  irfCode:         string;
  pisAliquot:      number;
  pisCode:         string;
  pccAliquot:      number;
  pccCode:         string;
  cofinsAliquot:   number;
  cofinsCode:      string;
  inssAliquot:     number;
  inssCode:        string;
  csllAliquot:     number;
  csllCode:        string;
  issAliquot:      number;
  issCode:         string;
  ibsAliquot:      number;
  ibsCode:         string;
  cbsAliquot:      number;
  cbsCode:         string;
  services:        TaxService[];
  status?:         TaxStatus;
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const TAX_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
  Pending:  { label: 'Pendente', variant: 'neutral' },
};

// ── Stakeholder (para select e exibição) ──────────────────────────────────────

export interface StakeholderItem {
  id:       number;
  name:     string;
  document: string;
}

// ── Opções de escopo (Centro de Custo / Projeto / Atividade) para os selects ───

export interface ScopeOption {
  id:   number;
  name: string;
}

export interface ScopeOptions {
  costCenters: ScopeOption[];
  projects:    ScopeOption[];
  activities:  ScopeOption[];
}
