// src/app/features/approval-tiers/approval-tiers.model.ts

export type ApprovalTierStatus   = 'Active' | 'Inactive';
export type ApprovalPurchaseRole = 'Requester' | 'Buyer' | 'RequestSupervisor' | 'PurchaseSupervisor' | 'InvoiceReceiver' | 'Finance' | 'Manager';

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

// Rótulos pt-BR dos papéis de compra (fonte única — reutilizar no form/modal/lista).
export const APPROVAL_PURCHASE_ROLE_LABELS: Record<string, string> = {
  Requester:          'Solicitante',
  Buyer:              'Comprador',
  RequestSupervisor:  'Supervisor de Pedidos',
  PurchaseSupervisor: 'Supervisor de Compras',
  InvoiceReceiver:    'Recebedor de NF',
  Finance:            'Financeiro',
  Manager:            'Gerente',
};

export const APPROVAL_PURCHASE_ROLE_OPTIONS = Object.entries(APPROVAL_PURCHASE_ROLE_LABELS)
  .map(([value, label]) => ({ value, label }));

export function approvalPurchaseRoleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return APPROVAL_PURCHASE_ROLE_LABELS[role] ?? role;
}