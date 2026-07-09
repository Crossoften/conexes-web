// src/app/features/work-plans/work-plans.model.ts
//
// Modelos de Planos de Trabalho (/v1/work-plans), alinhados ao Swagger.

export type WorkPlanStatus =
  | 'Draft'
  | 'AwaitingApproval'
  | 'Active'
  | 'Completed'
  | 'Cancelled';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface WorkPlanMetric {
  id:    string;
  label: string;
  value: string;
  icon:  'cube' | 'clock' | 'check' | 'trend';
  color: 'purple' | 'blue' | 'green';
}

/** Item enxuto para os resumos do dashboard (Propostas/Planos recentes). */
export interface WorkPlanSummaryItem {
  id:     number;
  title:  string;
  status: WorkPlanStatus;
}

export interface WorkPlanDashboard {
  metrics:         WorkPlanMetric[];
  recentProposals: WorkPlanSummaryItem[];
  recentPlans:     WorkPlanSummaryItem[];
}

// ── Item da listagem (GET /v1/work-plans) ─────────────────────────────────────

export interface WorkPlanListItem {
  id:              number;
  title:           string | null;
  instrumentType:  string | null;
  status:          WorkPlanStatus;
  startDate:       string | null;
  repassValue:     number | null;
  grantor?:        { legalName?: string; tradeName?: string } | null;
}

/** ViewModel de linha da tabela (valores já formatados). */
export interface WorkPlanRow {
  id:            number;
  title:         string;
  agency:        string;
  startDate:     string;
  transferValue: string;
  team:          string;
  receivedValue: string;
  type:          string;
  status:        WorkPlanStatus | '';
}

// ── Config de status (badge) ──────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'warning' | 'neutral';
}

export const WORK_PLAN_STATUS_CONFIG: Record<string, StatusConfig> = {
  Draft:            { label: 'Rascunho',           variant: 'neutral' },
  AwaitingApproval: { label: 'Aguardando análise', variant: 'warning' },
  Active:           { label: 'Ativo',              variant: 'success' },
  Completed:        { label: 'Concluído',          variant: 'success' },
  Cancelled:        { label: 'Cancelado',          variant: 'neutral' },
};
