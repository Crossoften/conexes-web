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
  | 'AwaitingAdjustment'
  | 'Quotation'
  | 'QuotationApproval'
  | 'Order'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type QuotationStatus = 'Pending' | 'Sent' | 'Approved' | 'Rejected';

/**
 * Papéis de alçada de compras (Swagger: purchaseRole / purchaseRoles).
 * Vêm das Alçadas de aprovação (/v1/approval-limits) e são refletidos em /my-self.
 */
export type PurchaseRole =
  | 'Requester'
  | 'Buyer'
  | 'RequestSupervisor'
  | 'PurchaseSupervisor'
  | 'InvoiceReceiver'
  | 'Finance'
  | 'Manager';

export type PurchaseContractStatus = 'Active' | 'Pending' | 'Inactive';

// ── Config de status para UI (badges) ─────────────────────────────────────────

export interface PurchaseStatusConfig {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

export const PURCHASE_REQUEST_STATUS_CONFIG: Record<PurchaseRequestStatus, PurchaseStatusConfig> = {
  Draft:              { label: 'Rascunho',             variant: 'warning' },
  AwaitingApproval:   { label: 'Aguardando aprovação', variant: 'neutral' },
  AwaitingAdjustment: { label: 'Aguardando ajustes',   variant: 'warning' },
  Quotation:          { label: 'Cotação',              variant: 'neutral' },
  QuotationApproval: { label: 'Cotação em aprovação', variant: 'neutral' },
  Order:             { label: 'Pedido',              variant: 'success' },
  Completed:         { label: 'Concluído',           variant: 'success' },
  Cancelled:         { label: 'Cancelado',           variant: 'danger'  },
  Rejected:          { label: 'Rejeitado',           variant: 'danger'  },
};

// ── Relações (formato exato a confirmar no teste real) ────────────────────────

export interface PurchaseRef {
  id?: number;
  name: string;
  email?: string | null;
  area?: string | null;
}

// ── Item da requisição ────────────────────────────────────────────────────────

export interface PurchaseRequestItem {
  id?: number;
  purchaseRequestId?: number;
  productId?: number | null;
  serviceId?: number | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  group?: string | null;
  referenceLink?: string | null;
  estimatedUnitValue?: number | null;
  finalUnitValue?: number | null;
  product?: PurchaseRef | null;
}

// ── Requisição de compra (resposta inferida) ──────────────────────────────────

export interface PurchaseRequest {
  id: number;
  referenceNumber?: string | null;
  title: string;
  area?: string | null;
  orderType?: string | null;
  status: PurchaseRequestStatus;
  currentStage?: number;
  requestDate?: string | null;
  expectedDeliveryDate?: string | null;
  estimatedValue?: number | null;
  description?: string | null;
  justification?: string | null;
  contractorObligations?: string | null;
  contractedObligations?: string | null;
  commercialConditions?: string | null;
  uniqueSupplier?: boolean;
  exclusiveSupplier?: boolean;
  withoutSubsidy?: boolean;
  supplierCount?: number | null;
  payingSource?: string | null;
  activity?: string | null;
  cancelReason?: string | null;
  cancelledAt?: string | null;
  requesterId?: number | null;
  buyerId?: number | null;
  projectId?: number | null;
  costCenterId?: number | null;
  accountPlanId?: number | null;
  partnershipId?: number | null;
  deliveryLocationId?: number | null;
  contractId?: number | null;
  requester?: PurchaseRef | null;
  buyer?: PurchaseRef | null;
  project?: PurchaseRef | null;
  costCenter?: PurchaseRef | null;
  accountPlan?: PurchaseRef | null;
  partnership?: PurchaseRef | null;
  deliveryLocation?: PurchaseDeliveryLocation | null;
  contract?: PurchaseRef | null;
  items?: PurchaseRequestItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseDeliveryLocation {
  id?: number;
  name: string;
  responsible?: string | null;
  zipCode?: string | null;
  address?: string | null;
  number?: string | null;
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

// ── Ações de Gerenciamento (Swagger v2) ───────────────────────────────────────

export interface ApproverLevel {
  level: number;  // 1 a 4
  userId: number;
}

/** Alçada de aprovação (/v1/approval-limits) — amarra usuário × nível × faixa × papel. */
export interface ApprovalLimit {
  id?:          number;
  description?: string;
  type?:        'FINANCEIRO' | 'COMPRAS';   // só COMPRAS vale para aprovar requisição
  level:        number;
  minValue:     number;
  maxValue:     number;
  purchaseRole: string;   // ex.: 'RequestSupervisor'
  userId:       number;
}

export interface SetApproversPayload {
  approvers: ApproverLevel[];
  reason?: string;
}

export interface ChangeBuyerPayload {
  buyerId: number;
  reason?: string;
}

export interface MoveStagePayload {
  stage: number;
  reason?: string;
}

export interface ReasonPayload {
  reason?: string;
}

/** Item do log de ações de uma requisição (PurchaseRequestHistoryItemDto). */
export interface PurchaseRequestActionLog {
  id: number;
  action?: string;
  stage?: number;
  description?: string;
  reason?: string;
  /** Alterações — hoje o back envia snapshot, não diff (BE-1). */
  changes?: unknown;
  user?: PurchaseRef | null;
  createdAt?: string;
}

/** Ações que abrem modal com formulário. */
export type PurchaseActionKind = 'cancel' | 'reject' | 'request-changes' | 'restart' | 'move' | 'buyer' | 'approvers';

/** Resultado emitido pelo modal de ação (payload já montado por tipo). */
export interface PurchaseActionResult {
  kind: PurchaseActionKind;
  reason?: string;
  stage?: number;
  buyerId?: number;
  approvers?: ApproverLevel[];
}

// ── Adjudicação (Etapa 4 — /requests/{id}/award) ──────────────────────────────

export type AwardMode = 'by_supplier' | 'by_item';

export interface AwardSelection {
  itemId:      number;
  quotationId: number;
}

export interface AwardPayload {
  mode:                 AwardMode;
  selections?:          AwardSelection[]; // obrigatório em by_item
  supplierQuotationId?: number;           // usado em by_supplier
  reason?:              string;
}

// ── Pedido de Compra (Etapas 5/6 — /orders) ───────────────────────────────────

export interface PurchaseOrder {
  id:                 number;
  purchaseRequestId?: number;
  supplierId?:        number;
  supplier?:          PurchaseRef | null;
  number?:            string | null;
  totalValue?:        number | null;
  status?:            string | null;
  items?:             PurchaseRequestItem[];
  createdAt?:         string;
}

export interface PurchaseOrderListParams {
  requestId?: number;
  status?:    string;
  skip?:      number;
  take?:      number;
}

// ── Dashboard (formato real da API) ───────────────────────────────────────────

export interface PurchaseDashboardCounters {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  rejected: number;
  cancelled: number;
  estimatedValue: number;
}

export interface PurchaseDashboardDistribution {
  draft: number;
  awaitingApproval: number;
  quotation: number;
  quotationApproval: number;
  order: number;
  completed: number;
  rejected: number;
  cancelled: number;
}

export interface DashboardRecentRequest {
  id: number;
  title: string;
  description: string | null;
  requester: string;
  date: string;
  elapsedDays: number;
  stage: number;
  status: PurchaseRequestStatus;
}

export interface PurchaseDashboardResponse {
  counters: PurchaseDashboardCounters;
  hasPending: boolean;
  pendingCount: number;
  recentRequests: DashboardRecentRequest[];
  distribution: PurchaseDashboardDistribution;
}

// ── Reexport util de paginação ────────────────────────────────────────────────

export type { Page };
