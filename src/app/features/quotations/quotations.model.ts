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
