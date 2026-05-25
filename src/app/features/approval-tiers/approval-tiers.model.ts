// src/app/features/approval-tiers/approval-tiers.model.ts

export type ApprovalTierStatus   = 'Active' | 'Inactive';
export type ApprovalPurchaseRole = 'Requester' | 'Approver' | 'Manager' | 'Director';

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface ApprovalTier {
  id:           number;
  description:  string;
  level:        number;
  minValue:     number;
  maxValue:     number;
  purchaseRole: ApprovalPurchaseRole | string;
  userId:       number;
  status?:      ApprovalTierStatus;
  createdAt?:   string;
  updatedAt?:   string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface ApprovalTierPayload {
  description:  string;
  level:        number;
  minValue:     number;
  maxValue:     number;
  purchaseRole: string;
  userId:       number;
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const APPROVAL_TIER_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};
