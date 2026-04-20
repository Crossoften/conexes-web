// src/app/features/stakeholders/stakeholders.model.ts

export type StakeholderView   = 'suppliers' | 'clients';
export type StakeholderType   = 'SUPPLIER' | 'CLIENT' | 'DONOR' | 'OTHER';
export type StakeholderStatus = 'ACTIVE' | 'INACTIVE';

export interface Stakeholder {
  id:        string;
  name:      string;
  document:  string;
  type:      StakeholderType;
  status:    StakeholderStatus;
  email?:    string;
  phone?:    string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const STAKEHOLDER_STATUS_CONFIG: Record<StakeholderStatus, StatusConfig> = {
  ACTIVE:   { label: 'Ativo',   variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger'  },
};

export const STAKEHOLDER_TYPE_LABELS: Record<StakeholderType, string> = {
  SUPPLIER: 'Fornecedor',
  CLIENT:   'Cliente',
  DONOR:    'Doador',
  OTHER:    'Outros',
};

// Quais tipos pertencem a cada visão
export const VIEW_TYPES: Record<StakeholderView, StakeholderType[]> = {
  suppliers: ['SUPPLIER', 'OTHER'],
  clients:   ['CLIENT', 'DONOR'],
};
