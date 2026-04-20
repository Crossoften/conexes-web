// src/app/features/quotations/quotations.model.ts

export type RequisitionStatus = 'DRAFT' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'PENDING';
export type OrderStatus       = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface Quotation {
  id:            string;
  typeId:        string;
  title:         string;
  costCenter:    string;
  group:         string;
  requester:     string;
  buyer:         string;
  requestDate:   string;
  deliveryDate:  string;
  reqStatus:     RequisitionStatus;
  orderStatus:   OrderStatus;
}

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

export const REQ_STATUS_CONFIG: Record<RequisitionStatus, StatusConfig> = {
  DRAFT:    { label: 'Rascunho', variant: 'warning' },
  ACTIVE:   { label: 'Ativo',    variant: 'success' },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  REJECTED: { label: 'Rejeitado',variant: 'danger'  },
  PENDING:  { label: 'Pendente', variant: 'neutral' },
};

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  ACTIVE:   { label: 'Ativo',    variant: 'success' },
  INACTIVE: { label: 'Inativo',  variant: 'danger'  },
  PENDING:  { label: 'Pendente', variant: 'neutral' },
};

// Definição das etapas — cada uma é uma rota filha
export interface QuotationStage {
  label:    string;
  subLabel: string;
  path:     string;
}

export const QUOTATION_STAGES: QuotationStage[] = [
  { label: 'Etapa 1', subLabel: 'Envio de requisição',       path: 'stage-1' },
  { label: 'Etapa 2', subLabel: 'Requisições em aprovação',  path: 'stage-2' },
  { label: 'Etapa 3', subLabel: 'Requisições aprovadas/cotação', path: 'stage-3' },
  { label: 'Etapa 4', subLabel: 'Cotações em aprovação',     path: 'stage-4' },
  { label: 'Etapa 5', subLabel: 'Compras aprovadas',         path: 'stage-5' },
  { label: 'Etapa 6', subLabel: 'Pedidos finalizados',       path: 'stage-6' },
  { label: 'Histórico', subLabel: 'Todas as requisições',    path: 'history'  },
];
