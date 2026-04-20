// src/app/features/positions/positions.mock.ts
import { Position } from './positions.model';

export const POSITIONS_MOCK: Position[] = Array.from({ length: 25 }, (_, i) => ({
  id: `pos-${i + 1}`,
  entity: 'Exemplo nome',
  electionDate: 'Exemplo',
  type: 'Exemplo',
  purpose: 'Exemplo',
  status: i % 3 === 0 ? 'INACTIVE' : 'ACTIVE',
}));