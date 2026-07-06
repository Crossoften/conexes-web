// src/app/features/purchasing-dashboard/purchasing-dashboard.model.ts

import { PurchaseRequestStatus } from '../purchases/purchases.model';

export interface Requisition {
  id:     string;
  code:   string;
  status: PurchaseRequestStatus;
  title:  string;
  value:  number;
  author: string;
  date:   string;
  stage:  string;
}

export interface StatusDistribution {
  status: PurchaseRequestStatus;
  label:  string;
  count:  number;
  color:  string;
  total:  number; // para calcular % da barra
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  icon:  'chart' | 'clock-orange' | 'clock-blue' | 'dollar';
}

export const REQUISITION_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  Draft:             'Rascunho',
  AwaitingApproval:  'Aguardando aprovação',
  Quotation:         'Cotação',
  QuotationApproval: 'Cotação em aprovação',
  Order:             'Pedido',
  Completed:         'Concluído',
  Cancelled:         'Cancelado',
  Rejected:          'Rejeitado',
};

export const REQUISITION_STATUS_COLORS: Record<PurchaseRequestStatus, string> = {
  Draft:             '#F97316',
  AwaitingApproval:  '#3B82F6',
  Quotation:         '#EAB308',
  QuotationApproval: '#6366F1',
  Order:             '#8B5CF6',
  Completed:         '#22C55E',
  Cancelled:         '#6B7280',
  Rejected:          '#EF4444',
};
