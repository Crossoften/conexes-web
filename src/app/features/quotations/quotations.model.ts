// src/app/features/quotations/quotations.model.ts
import {
  PurchaseRequestStatus,
  PurchaseStatusConfig,
  PURCHASE_REQUEST_STATUS_CONFIG,
} from '../purchases/purchases.model';

/** Linha da tabela de cotações (view model derivado de PurchaseRequest). */
export interface Quotation {
  id:           string; // String(apiId) — usado na seleção (Set<string>)
  apiId:        number; // id numérico para chamadas à API
  typeId:       string;
  title:        string;
  costCenter:   string;
  group:        string;
  requester:    string;
  buyer:        string;
  requestDate:  string;
  deliveryDate: string;
  reqStatus:    PurchaseRequestStatus;
  /**
   * COM-E6 / I026-I028-I030 (decisão D2): o PEDIDO é o registro central da Etapa 6.
   * A lista mostrava só a situação da REQUISIÇÃO, então uma requisição aparecia em
   * "Pedidos finalizados" sem dizer qual pedido saiu nem se ele ainda está em
   * recebimento. Entrar na Etapa 6 significa pedido EMITIDO; a conclusão física
   * continua explícita na situação de cada pedido.
   */
  orders: QuotationOrderRef[];
}

/** D2: o pedido ligado à requisição, como a Etapa 6 precisa mostrá-lo. */
export interface QuotationOrderRef {
  id:       number;
  number:   string;   // PED-AAAA-NNNN, o mesmo que os documentos imprimem
  status:   string;   // Open | InProgress | Completed | Cancelled
  label:    string;   // a situação em português
  supplier: string;
}

export type StatusConfig = PurchaseStatusConfig;

export const REQ_STATUS_CONFIG: Record<PurchaseRequestStatus, PurchaseStatusConfig> =
  PURCHASE_REQUEST_STATUS_CONFIG;

// ── Definição das etapas — cada uma é uma rota filha ──────────────────────────
export interface QuotationStage {
  label:    string;
  subLabel: string;
  path:     string;
}

export const QUOTATION_STAGES: QuotationStage[] = [
  { label: 'Etapa 1', subLabel: 'Envio de requisição',           path: 'stage-1' },
  { label: 'Etapa 2', subLabel: 'Requisições em aprovação',      path: 'stage-2' },
  { label: 'Etapa 3', subLabel: 'Requisições aprovadas/cotação', path: 'stage-3' },
  { label: 'Etapa 4', subLabel: 'Cotações em aprovação',         path: 'stage-4' },
  { label: 'Etapa 5', subLabel: 'Compras aprovadas',             path: 'stage-5' },
  { label: 'Etapa 6', subLabel: 'Pedidos finalizados',           path: 'stage-6' },
  { label: 'Histórico', subLabel: 'Todas as requisições',        path: 'history'  },
];
