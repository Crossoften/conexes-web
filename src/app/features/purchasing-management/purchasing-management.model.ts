// src/app/features/purchasing-management/purchasing-management.model.ts
import {
  PurchaseRequestStatus,
  PURCHASE_REQUEST_STATUS_CONFIG,
  PurchaseStatusConfig,
} from '../purchases/purchases.model';

/** Linha da tabela de gerenciamento (view model derivado de PurchaseRequest). */
export interface PurchasingReq {
  id:           string; // String(apiId) — usado na seleção (Set<string>)
  apiId:        number; // id numérico para chamadas à API
  typeId:       string;
  title:        string;
  costCenter:   string;
  group:        string;
  requester:    string;
  stage:        string;
  reqDate:      string;
  deliveryDate: string;
  status:       PurchaseRequestStatus;
}

export type ReqStatus = PurchaseRequestStatus;

export const REQ_STATUS_CONFIG: Record<PurchaseRequestStatus, PurchaseStatusConfig> =
  PURCHASE_REQUEST_STATUS_CONFIG;
