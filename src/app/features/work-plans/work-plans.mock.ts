// src/app/features/work-plans/work-plans.mock.ts
import { WorkPlanMetric, Proposal, ActivePlan } from './work-plans.model';

export const WORK_PLANS_METRICS_MOCK: WorkPlanMetric[] = [
  { id: '1', label: 'Produtos em elaboração', value: '1.254', icon: 'cube', color: 'purple' },
  { id: '2', label: 'Aguardando aprovação', value: '9', icon: 'clock', color: 'blue' },
  { id: '3', label: 'Planos ativos', value: '7', icon: 'check', color: 'green' },
  { id: '4', label: 'Totais de propostas', value: '3', icon: 'trend', color: 'purple' },
];

const generateBaseItem = (i: number) => ({
  id: `item-${i}`,
  title: '000',
  agency: 'Exemplo nome',
  startDate: 'Exemplo nome',
  transferValue: 'Exemplo nome',
  team: 'Exemplo nome',
  receivedValue: 'Exemplo nome',
  type: 'TC'
});

export const PROPOSALS_MOCK: Proposal[] = Array.from({ length: 25 }, (_, i) => ({
  ...generateBaseItem(i),
  id: `prop-${i}`,
  status: i % 4 === 0 || i % 4 === 1 ? 'ANALYSIS' : 'DRAFT'
}));

export const ACTIVE_PLANS_MOCK: ActivePlan[] = Array.from({ length: 15 }, (_, i) => ({
  ...generateBaseItem(i),
  id: `plan-${i}`,
  status: 'ACTIVE'
}));