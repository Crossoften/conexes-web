// src/app/features/budgets/budgets.mock.ts
import { Budget } from './budgets.model';

export const BUDGETS_MOCK: Budget[] = Array.from({ length: 25 }, (_, i) => ({
  id: `budget-${i + 1}`,
  displayId: 'Exemplo nome',
  title: '000',
  tracking: 'Exemplo nome',
  description: 'Exemplo nome',
  fiscalYear: 'Exemplo nome',
  periodicity: 'Exemplo nome',
  status: i % 6 === 0 ? 'INACTIVE' : 'ACTIVE', // Simula alguns inativos
}));