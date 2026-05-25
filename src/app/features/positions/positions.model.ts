// src/app/features/positions/positions.model.ts

export type PositionStatus = 'Active' | 'Inactive';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface GoverningBodyMember {
  collaboratorId: number;
  startDate:      string;
  endDate:        string;
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Position {
  id:            number;
  entityId:      number;
  electionDate:  string;
  type:          string;
  purpose:       string;
  description:   string;
  tcespCertCode: string;
  members:       GoverningBodyMember[];
  status?:       PositionStatus;
  createdAt?:    string;
  updatedAt?:    string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface PositionPayload {
  entityId:      number;
  electionDate:  string;
  type:          string;
  purpose:       string;
  description:   string;
  tcespCertCode: string;
  members:       GoverningBodyMember[];
}
