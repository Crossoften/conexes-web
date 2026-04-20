// src/app/features/work-plans/work-plans.model.ts
export type ProposalStatus = 'ANALYSIS' | 'DRAFT';
export type PlanStatus = 'ACTIVE';

export interface WorkPlanMetric {
  id: string;
  label: string;
  value: string;
  icon: 'cube' | 'clock' | 'check' | 'trend';
  color: 'purple' | 'blue' | 'green';
}

export interface WorkPlanItem {
  id: string;
  title: string;
  agency: string;
  startDate: string;
  transferValue: string;
  team: string;
  receivedValue: string;
  type: string; // Ex: 'TC'
}

export interface Proposal extends WorkPlanItem {
  status: ProposalStatus;
}

export interface ActivePlan extends WorkPlanItem {
  status: PlanStatus;
}

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, { label: string; variant: 'warning' | 'neutral' }> = {
  ANALYSIS: { label: 'Aguardando análise', variant: 'warning' },
  DRAFT: { label: 'Rascunho', variant: 'neutral' },
};

export const PLAN_STATUS_CONFIG: Record<PlanStatus, { label: string; variant: 'success' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
};