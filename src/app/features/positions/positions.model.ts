// src/app/features/positions/positions.model.ts

// Valores canônicos dos enums do back (sem espaço/acento). Rótulos amigáveis nos maps.
export type PositionType    = 'ConselhoFiscal' | 'CorpoDiretivo' | 'Responsavel';
export type PositionPurpose = 'Ajuste' | 'PrestacaoDeContas';
export type PositionStatus  = 'Active' | 'Pending' | 'Inactive';

export const POSITION_TYPE_LABELS: Record<string, string> = {
  ConselhoFiscal: 'Conselho Fiscal',
  CorpoDiretivo:  'Corpo Diretivo',
  Responsavel:    'Responsável',
  // legado (valores antigos com espaço/acento)
  'Conselho Fiscal': 'Conselho Fiscal',
  'Corpo Diretivo':  'Corpo Diretivo',
  'Responsável':     'Responsável',
};

export const POSITION_PURPOSE_LABELS: Record<string, string> = {
  Ajuste:            'Ajuste',
  PrestacaoDeContas: 'Prestação de Contas',
  'Prestação de Contas': 'Prestação de Contas', // legado
};

export const POSITION_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Pending:  { label: 'Pendente', variant: 'neutral' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
};

export const POSITION_STATUS_OPTIONS: { label: string; value: PositionStatus }[] = [
  { label: 'Ativo',    value: 'Active'   },
  { label: 'Pendente', value: 'Pending'  },
  { label: 'Inativo',  value: 'Inactive' },
];

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface GoverningBodyMember {
  collaboratorId: number;
  startDate:      string | null;   // ISO 8601 ou null (o back exige ISO)
  endDate:        string | null;
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Position {
  id:            number;
  entityId:      number;
  electionDate:  string;
  type:          string;
  purpose:       string;
  status:        PositionStatus;
  description:   string;
  tcespCertCode: string;
  members:       GoverningBodyMember[];
  createdAt?:    string;
  updatedAt?:    string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface PositionPayload {
  entityId:      number;
  electionDate:  string | null;
  type:          string;
  purpose:       string;
  status?:       PositionStatus;
  description:   string;
  tcespCertCode: string;
  members:       GoverningBodyMember[];
}
