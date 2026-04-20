// src/app/features/approval-tiers/approval-tiers.mock.ts
import { ApprovalTier } from './approval-tiers.model';

export const APPROVAL_TIERS_MOCK: ApprovalTier[] = Array.from({ length: 25 }, (_, i) => {
  // Simula os níveis 1, 2 e 3 como na imagem
  let level = 3;
  if (i === 0) level = 1;
  else if (i === 1 || i === 2) level = 2;

  return {
    id: `tier-${i + 1}`,
    level: level,
    description: 'EXEMPLO DESCRIÇÃO',
    approver: 'NOME APROVADOR',
    valueRange: '$$$ - $$$',
    status: i % 4 === 0 ? 'INACTIVE' : 'ACTIVE', // Status simulado para os filtros
  };
});