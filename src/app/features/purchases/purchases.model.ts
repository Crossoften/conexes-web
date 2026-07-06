// src/app/features/purchases/purchases.model.ts
//
// Modelos e contratos do domínio de Compras (/v1/purchases).
// Requests (payloads/query) espelham fielmente os DTOs do Swagger.
// Responses de listagem/detalhe não são tipadas no Swagger (200:{}), por isso
// os campos de resposta são inferidos e marcados como opcionais; serão
// confirmados/ajustados na validação com o backend real.

import { Page } from '../../shared/models/list-page.model';

// ── Enums (valores exatos do backend) ─────────────────────────────────────────

export type PurchaseRequestStatus =
  | 'Draft'
  | 'AwaitingApproval'
  | 'Quotation'
  | 'QuotationApproval'
  | 'Order'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type QuotationStatus = 'Pending' | 'Sent' | 'Approved' | 'Rejected';

export type PurchaseContractStatus = 'Active' | 'Pending' | 'Inactive';

// ── Config de status para UI (badges) ─────────────────────────────────────────

export interface PurchaseStatusConfig {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

export const PURCHASE_REQUEST_STATUS_CONFIG: Record<PurchaseRequestStatus, PurchaseStatusConfig> = {
  Draft:             { label: 'Rascunho',            variant: 'warning' },
  AwaitingApproval:  { label: 'Aguardando aprovação', variant: 'neutral' },
  Quotation:         { label: 'Cotação',             variant: 'neutral' },
  QuotationApproval: { label: 'Cotação em aprovação', variant: 'neutral' },
  Order:             { label: 'Pedido',              variant: 'success' },
  Completed:         { label: 'Concluído',           variant: 'success' },
  Cancelled:         { label: 'Cancelado',           variant: 'danger'  },
  Rejected:          { label: 'Rejeitado',           variant: 'danger'  },
};

// ── Relações (formato exato a confirmar no teste real) ────────────────────────

export interface PurchaseRef {
  id: number;
  name: string;
}

// ── Item da requisição ────────────────────────────────────────────────────────

export interface PurchaseRequestItem {
  id?: number;
  productId?: number;
  serviceId?: number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  group?: string;
  referenceLink?: string;
  estimatedUnitValue?: number;
}

// ── Requisição de compra (resposta inferida) ──────────────────────────────────

export interface PurchaseRequest {
  id: number;
  referenceNumber?: string;
  title: string;
  area?: string;
  orderType?: string;
  status: PurchaseRequestStatus;
  stage?: number;
  requestDate?: string;
  expectedDeliveryDate?: string;
  estimatedValue?: number;
  description?: string;
  requester?: PurchaseRef | null;
  buyer?: PurchaseRef | null;
  project?: PurchaseRef | null;
  costCenter?: PurchaseRef | null;
  group?: string;
  items?: PurchaseRequestItem[];
  createdAt?: string;
  updatedAt?: string;
}

// ── Cotação (resposta inferida) ───────────────────────────────────────────────

export interface PurchaseQuotation {
  id: number;
  purchaseRequestId: number;
  supplierId: number;
  supplier?: PurchaseRef | null;
  unitValue: number;
  totalValue: number;
  freight?: number;
  discount?: number;
  deliveryTime?: string;
  paymentConditions?: string;
  observation?: string;
  status: QuotationStatus;
  createdAt?: string;
}

// ── Contrato (resposta inferida) ──────────────────────────────────────────────

export interface PurchaseContract {
  id: number;
  number?: string;
  title: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  status?: PurchaseContractStatus;
  observation?: string;
  stakeholderId?: number;
  stakeholder?: PurchaseRef | null;
  createdAt?: string;
}

// ── Arquivo anexado ───────────────────────────────────────────────────────────

export interface PurchaseFile {
  id: number;
  fileUrl: string;
  fileKey: string;
  name?: string;
}

// ── Filtros / query params ────────────────────────────────────────────────────

export interface PurchaseRequestListParams {
  search?: string;
  status?: PurchaseRequestStatus;
  stage?: number;
  requesterId?: number;
  buyerId?: number;
  skip?: number;
  take?: number;
}

export interface PurchaseHistoryParams {
  requesterId?: number;
  skip?: number;
  take?: number;
}

export interface PurchaseContractListParams {
  search?: string;
  skip?: number;
  take?: number;
}

// ── Payloads (espelham os DTOs do Swagger) ────────────────────────────────────

export interface DeliveryLocationPayload {
  name: string;
  responsible?: string;
  zipCode?: string;
  address?: string;
  number?: string;
}

export interface PurchaseRequestItemPayload {
  productId?: number;
  serviceId?: number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  group?: string;
  referenceLink?: string;
  estimatedUnitValue?: number;
}

export interface CreatePurchaseRequestPayload {
  title: string;
  area?: string;
  referenceNumber?: string;
  orderType?: string;
  requestDate?: string;
  expectedDeliveryDate?: string;
  estimatedValue?: number;
  description?: string;
  justification?: string;
  contractorObligations?: string;
  contractedObligations?: string;
  commercialConditions?: string;
  uniqueSupplier?: boolean;
  exclusiveSupplier?: boolean;
  withoutSubsidy?: boolean;
  requesterId: number;
  buyerId?: number;
  projectId?: number;
  costCenterId?: number;
  accountPlanId?: number;
  partnershipId?: number;
  deliveryLocationId?: number;
  contractId?: number;
  payingSource?: string;
  subProjectId?: number;
  activity?: string;
  supplierCount?: number;
  newDeliveryLocation?: DeliveryLocationPayload;
  items: PurchaseRequestItemPayload[];
}

export type UpdatePurchaseRequestPayload = Partial<CreatePurchaseRequestPayload>;

export interface CreateQuotationPayload {
  purchaseRequestId: number;
  supplierId: number;
  unitValue: number;
  totalValue: number;
  freight?: number;
  discount?: number;
  deliveryTime?: string;
  paymentConditions?: string;
  observation?: string;
  status?: QuotationStatus;
}

export interface CreateContractPayload {
  title: string;
  number?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  status?: PurchaseContractStatus;
  observation?: string;
  stakeholderId?: number;
}

export type UpdateContractPayload = Partial<CreateContractPayload>;

export interface AttachFilePayload {
  fileUrl: string;
  fileKey: string;
}

// ── Dashboard (resposta inferida — a confirmar no teste real) ─────────────────

export interface PurchaseDashboardResponse {
  totalRequests?: number;
  pendingCount?: number;
  inProgressCount?: number;
  estimatedValue?: number;
  recentRequests?: PurchaseRequest[];
  statusDistribution?: { status: PurchaseRequestStatus; count: number }[];
}

// ── Reexport util de paginação ────────────────────────────────────────────────

export type { Page };
