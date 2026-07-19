// src/app/features/approval-tiers/approval-tiers.model.ts

export type ApprovalTierStatus   = 'Active' | 'Pending' | 'Inactive';
export type ApprovalTierType     = 'FINANCEIRO' | 'COMPRAS';
export type ApprovalPurchaseRole = 'Requester' | 'Buyer' | 'RequestSupervisor' | 'PurchaseSupervisor' | 'InvoiceReceiver' | 'Finance' | 'Manager';

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface ApprovalTier {
  id:            number;
  description:   string;
  type?:         ApprovalTierType;   // FINANCEIRO (pagamento) ou COMPRAS
  level?:        number;
  isManagerTier?: boolean;           // nível "Gestor" do FINANCEIRO (sem número)
  minValue:      number;
  maxValue:      number;
  purchaseRole?: ApprovalPurchaseRole | string;   // só COMPRAS
  userId:        number;
  status?:       ApprovalTierStatus;
  createdAt?:    string;
  updatedAt?:    string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface ApprovalTierPayload {
  description:   string;
  type:          ApprovalTierType;
  level?:        number;             // COMPRAS 1-4; FINANCEIRO 1-5 (ou omitido se isManagerTier)
  isManagerTier?: boolean;
  minValue:      number;
  maxValue:      number;
  purchaseRole?: string;             // obrigatório em COMPRAS; omitido em FINANCEIRO
  userId:        number;
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const APPROVAL_TIER_TYPE_LABELS: Record<string, string> = {
  FINANCEIRO: 'Financeiro',
  COMPRAS:    'Compras',
};

export const APPROVAL_TIER_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',     variant: 'success' },
  Pending:  { label: 'Pendente',  variant: 'warning' },
  Inactive: { label: 'Inativo',   variant: 'danger'  },
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