// src/app/features/positions/positions.model.ts
export type PositionStatus = 'ACTIVE' | 'INACTIVE';

export interface Position {
  id: string;
  entity: string;
  electionDate: string;
  type: string;
  purpose: string;
  status: PositionStatus; // Usado para o filtro, não renderizado
}