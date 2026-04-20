// src/app/features/purchasing-dashboard/purchasing-dashboard.mock.ts
import { Requisition, StatusDistribution, DashboardMetric } from './purchasing-dashboard.model';

export const DASHBOARD_METRICS: DashboardMetric[] = [
  { label: 'Total de requisições', value: 50,          icon: 'chart'       },
  { label: 'Pendentes',            value: 2,           icon: 'clock-orange' },
  { label: 'Em andamento',         value: 9,           icon: 'clock-blue'   },
  { label: 'Valor estimado',       value: 'R$100.000', icon: 'dollar'       },
];

export const RECENT_REQUISITIONS: Requisition[] = [
  { id: '1', code: 'REQ-2026-007', status: 'PENDING_ANALYSIS', title: 'Notebooks para RH', value: 19500, author: 'Daniela Pereira', date: '11/02/2026', stage: 'Etapa 4' },
  { id: '2', code: 'REQ-2026-007', status: 'PENDING_ANALYSIS', title: 'Notebooks para RH', value: 19500, author: 'Daniela Pereira', date: '11/02/2026', stage: 'Etapa 4' },
  { id: '3', code: 'REQ-2026-007', status: 'PENDING_ANALYSIS', title: 'Notebooks para RH', value: 19500, author: 'Daniela Pereira', date: '11/02/2026', stage: 'Etapa 4' },
  { id: '4', code: 'REQ-2026-007', status: 'PENDING_ANALYSIS', title: 'Notebooks para RH', value: 19500, author: 'Daniela Pereira', date: '11/02/2026', stage: 'Etapa 4' },
];

export const STATUS_DISTRIBUTION: StatusDistribution[] = [
  { status: 'DRAFT',     label: 'Rascunho',  count: 2,  color: '#F97316', total: 50 },
  { status: 'APPROVAL',  label: 'Aprovação', count: 5,  color: '#3B82F6', total: 50 },
  { status: 'QUOTATION', label: 'Cotação',   count: 1,  color: '#EAB308', total: 50 },
  { status: 'ORDERS',    label: 'Pedidos',   count: 3,  color: '#8B5CF6', total: 50 },
  { status: 'COMPLETED', label: 'Concluído', count: 5,  color: '#22C55E', total: 50 },
  { status: 'REJECTED',  label: 'Rejeitado', count: 1,  color: '#EF4444', total: 50 },
];

export const PENDING_COUNT = 2;
