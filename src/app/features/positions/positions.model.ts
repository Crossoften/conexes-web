// src/app/features/positions/positions.model.ts

// Obs.: `status` NÃO existe no contrato `/v1/institutional/governing-bodies` —
// removido do front até o Back definir (B-CD-02).

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
