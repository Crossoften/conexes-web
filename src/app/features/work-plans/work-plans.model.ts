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
  id:               number;
  title:            string | null;
  instrumentType:   string | null;
  status:           WorkPlanStatus;
  startDate:        string | null;
  repassValue:      number | null;
  teamWorkContent?: string | null;   // JSON-in-string dos membros (→ coluna Equipe)
  grantor?:         { legalName?: string; tradeName?: string } | null;
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

// ── Lookup ────────────────────────────────────────────────────────────────────

export interface WorkPlanRef {
  id:         number;
  legalName?: string;
  tradeName?: string;
  name?:      string;
}

// ── Sub-payloads (CreateWorkPlanDto) ──────────────────────────────────────────

export interface OSCCelebrantePayload {
  name:            string;
  cnpj:            string;
  zipCode?:        string;
  address?:        string;
  number?:         string;
  complement?:     string;
  actionLocations?: string;
  site?:           string;
  repName?:        string;
  repJobTitle?:    string;
  repRg?:          string;
  repExpOrgan?:    string;
  repCpf?:         string;
}

export interface OSCExecutadaPayload {
  name:         string;
  cnpj:         string;
  zipCode?:     string;
  address?:     string;
  number?:      string;
  complement?:  string;
  repName?:     string;
  repJobTitle?: string;
  repRg?:       string;
  repExpOrgan?: string;
  repCpf?:      string;
}

export interface WorkPlanResponsiblePayload {
  name:      string;
  function?: string;
  rg?:       string;
  expOrgan?: string;
  cpf?:      string;
  phone?:    string;
  email?:    string;
}

export interface WorkPlanGoalPayload {
  expectedResult?:    string;
  indicator?:         string;
  verificationMeans?: string;
  quantitativeMeta?:  number;
  networkAction?:     boolean;
  executionSteps?:    string;
  logoUrl?:           string;
}

export interface ApplicationPlanPayload {
  linkedGoalId?: number;
  linkedStepId?: number;
  expenseItem:   string;
  inKindPayment?: boolean;
  expenseType:   string;
  unit:          string;
  quantity:      number;
  unitValue:     number;
  totalValue:    number;
}

export interface ReimbursementPayload {
  installment:   number;
  monthYear:     string;
  value:         number;
  linkedGoalId?: number;
}

/** Entidade completa retornada por GET /v1/work-plans/{id} (para edição). */
export interface WorkPlanDetail {
  id:                    number;
  title?:                string | null;
  instrumentType?:       string | null;
  programNumber?:        string | null;
  status?:               WorkPlanStatus;
  proposalNumber?:       string | null;
  object?:               string | null;
  specificObjects?:      string | null;
  executionLocation?:    string | null;
  realityDescription?:   string | null;
  partnershipObject?:    string | null;
  targetAudience?:       string | null;
  activityDescription?:  string | null;
  startDate?:            string | null;
  endDate?:              string | null;
  repassValue?:          number | null;
  mandatoryCounterpart?: number | null;
  voluntaryCounterpart?: number | null;
  globalValue?:          number | null;
  adminExpensesValue?:   number | null;
  teamWorkContent?:      string | null;
  monitoringContent?:    string | null;
  layout?:               unknown;
  grantorId?:            number | null;
  projectId?:            number | null;
  celebrante?:           OSCCelebrantePayload | null;
  executada?:            OSCExecutadaPayload | null;
  responsible?:          WorkPlanResponsiblePayload | null;
  goals?:                WorkPlanGoalPayload[] | null;
  applicationPlans?:     ApplicationPlanPayload[] | null;
  reimbursements?:       ReimbursementPayload[] | null;
}

export interface CreateWorkPlanPayload {
  title:                 string;
  instrumentType?:       string;
  programNumber?:        string;
  status?:               WorkPlanStatus;
  proposalNumber?:       string;
  object?:               string;
  specificObjects?:      string;
  executionLocation?:    string;
  realityDescription?:   string;
  partnershipObject?:    string;
  targetAudience?:       string;
  activityDescription?:  string;
  startDate?:            string;
  endDate?:              string;
  repassValue?:          number;
  mandatoryCounterpart?: number;
  voluntaryCounterpart?: number;
  globalValue?:          number;
  adminExpensesValue?:   number;
  teamWorkContent?:      string;
  monitoringContent?:    string;
  layout?:               unknown;
  grantorId:             number;
  projectId?:            number;
  celebrante?:           OSCCelebrantePayload;
  executada?:            OSCExecutadaPayload;
  responsible?:          WorkPlanResponsiblePayload;
  goals?:                WorkPlanGoalPayload[];
  applicationPlans?:     ApplicationPlanPayload[];
  reimbursements?:       ReimbursementPayload[];
}
