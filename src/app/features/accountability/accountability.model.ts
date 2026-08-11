// src/app/features/accountability/accountability.model.ts
export interface AccountabilityListItem {
  id: number;
  partnershipId: number;
  title: string;
  status: 'Open' | 'Approved' | 'Returned';
  periodStart: string | null;
  periodEnd: string | null;
  approvedAt: string | null;
  itemsTotal: number;
  itemsValidated: number;
  itemsPending: number;
  itemsReturned: number;
}

export interface AccountabilityPayment {
  id: number;
  description: string | null;
  supplier: string | null;
  grossAmount: number | null;
  dueDate: string | null;
  status: string;
}

export interface AccountabilityItem {
  id: number;
  status: 'Pending' | 'Validated' | 'Returned';
  cndOk: boolean | null;
  rubricaOk: boolean | null;
  returnReason: string | null;
  payment: AccountabilityPayment | null;
}

export interface AccountabilityDetail {
  id: number;
  title: string;
  status: 'Open' | 'Approved' | 'Returned';
  periodStart: string | null;
  periodEnd: string | null;
  approvedAt: string | null;
  partnership: { id: number; title: string } | null;
  items: AccountabilityItem[];
}

export interface PartnershipOption { id: number; title: string; }

export const ACC_STATUS_LABEL: Record<string, { label: string; variant: 'neutral' | 'success' | 'danger' }> = {
  Open: { label: 'Em análise', variant: 'neutral' },
  Approved: { label: 'Aprovada', variant: 'success' },
  Returned: { label: 'Devolvida', variant: 'danger' },
};
export const ITEM_STATUS_LABEL: Record<string, { label: string; variant: 'neutral' | 'success' | 'danger' }> = {
  Pending: { label: 'Pendente', variant: 'neutral' },
  Validated: { label: 'Validado', variant: 'success' },
  Returned: { label: 'Devolvido', variant: 'danger' },
};
