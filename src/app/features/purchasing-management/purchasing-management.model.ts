// src/app/features/purchasing-management/purchasing-management.model.ts
export type ReqStatus = 'ACTIVE' | 'CANCELLED';

export interface PurchasingReq {
  id: string;
  typeId: string;
  title: string;
  costCenter: string;
  group: string;
  requester: string;
  stage: string;
  reqDate: string;
  deliveryDate: string;
  status: ReqStatus;
}

export const REQ_STATUS_CONFIG: Record<ReqStatus, { label: string; variant: 'success' | 'danger' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  CANCELLED: { label: 'Ordem cancelada', variant: 'danger' },
};