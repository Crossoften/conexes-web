// src/app/features/agencies/agencies.model.ts
export type AgencyStatus = 'ACTIVE' | 'INACTIVE';
export type AgencyType = 'PUBLIC' | 'PRIVATE';

export interface Agency {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  state: string;
  status: AgencyStatus;
  type: AgencyType;
}

export const AGENCY_STATUS_CONFIG: Record<AgencyStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};