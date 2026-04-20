// src/app/features/budgets/budgets.model.ts
export type BudgetTab = 'BUDGETS' | 'PLANNING' | 'TRACKING';
export type BudgetStatus = 'ACTIVE' | 'INACTIVE';

export interface Budget {
  id: string;
  displayId: string;
  title: string;
  tracking: string;
  description: string;
  fiscalYear: string;
  periodicity: string;
  status: BudgetStatus;
}

export const BUDGET_STATUS_CONFIG: Record<BudgetStatus, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  ACTIVE: { label: 'Ativo', variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'danger' },
};