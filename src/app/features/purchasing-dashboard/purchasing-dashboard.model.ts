// src/app/features/purchasing-dashboard/purchasing-dashboard.model.ts

export type RequisitionStatus =
  | 'DRAFT'
  | 'APPROVAL'
  | 'QUOTATION'
  | 'ORDERS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'PENDING_ANALYSIS';

export interface Requisition {
  id:     string;
  code:   string;
  status: RequisitionStatus;
  title:  string;
  value:  number;
  author: string;
  date:   string;
  stage:  string;
}

export interface StatusDistribution {
  status: RequisitionStatus;
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

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  DRAFT:           'Rascunho',
  APPROVAL:        'Aprovação',
  QUOTATION:       'Cotação',
  ORDERS:          'Pedidos',
  COMPLETED:       'Concluído',
  REJECTED:        'Rejeitado',
  PENDING_ANALYSIS:'Aguardando Análise',
};

export const REQUISITION_STATUS_COLORS: Record<RequisitionStatus, string> = {
  DRAFT:            '#F97316',
  APPROVAL:         '#3B82F6',
  QUOTATION:        '#EAB308',
  ORDERS:           '#8B5CF6',
  COMPLETED:        '#22C55E',
  REJECTED:         '#EF4444',
  PENDING_ANALYSIS: '#F97316',
};
