// src/app/features/approval-tiers/approval-tiers.model.ts
export type ApprovalTierStatus = 'ACTIVE' | 'INACTIVE';

export interface ApprovalTier {
  id: string;
  level: number;
  description: string;
  approver: string;
  valueRange: string;
  status: ApprovalTierStatus;
}

export const APPROVAL_TIER_STATUS_CONFIG: Record<ApprovalTierStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};