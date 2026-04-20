// src/app/features/taxes/taxes.model.ts
export type TaxStatus = 'ACTIVE' | 'INACTIVE';

export interface Tax {
  id: string;
  code: string;
  provider: string;
  service: string;
  totalRetentions: string; 
  status: TaxStatus;
}

export const TAX_STATUS_CONFIG: Record<TaxStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};