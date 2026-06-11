// src/app/features/taxes/taxes.model.ts

export type TaxStatus = 'Active' | 'Inactive';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface TaxService {
  name:           string;
  description:    string;
  externalCode:   string;
  grantorOrgan:   string;
  hasRetention:   boolean;
  accessorOrgan:  string;
  concessionLink: string;
  costCenterId:   number;
  projectId:      number;
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
  csllAliquot:     number;
  ibsAliquot:      number;
  cbsAliquot:      number;
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
  csllAliquot:     number;
  ibsAliquot:      number;
  cbsAliquot:      number;
  services:        TaxService[];
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const TAX_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};

// ── Stakeholder (para select e exibição) ──────────────────────────────────────

export interface StakeholderItem {
  id:       number;
  name:     string;
  document: string;
}
