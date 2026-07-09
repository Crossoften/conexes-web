// src/app/features/contract-transfers/contract-transfers.model.ts
//
// Modelos de Repasses e Parcerias (/v1/partnerships), alinhados ao Swagger.

export type PartnershipStatus = 'Active' | 'Pending' | 'Inactive';

/** Referência enxuta (órgão/entidade) retornada em joins. */
export interface PartnershipRef {
  id:         number;
  legalName?: string;
  tradeName?: string;
  name?:      string;
}

// ── Item da listagem (GET /v1/partnerships → já vem achatado) ─────────────────
// O backend responde a lista com os campos prontos da tabela; não traz
// receivedValue/saldo (esses ficam no detalhe/cálculo).

export interface PartnershipListItem {
  id:            number;
  client:        string | null;
  contractName:  string | null;
  contractCode:  string | null;
  description:   string | null;
  approvedValue: number | null;
  grantor:       string | null;
  status:        PartnershipStatus;
}

// ── Entidade (detalhe — GET /v1/partnerships/{id}) ────────────────────────────

export interface Partnership {
  id:             number;
  title:          string;
  manager?:       string;
  termNumber?:    string;
  object?:        string;
  totalValue?:    number;
  receivedValue?: number;
  balanceValue?:  number;
  status?:        PartnershipStatus;
  grantorId?:     number;
  entityId?:      number;
  grantor?:       PartnershipRef;
  entity?:        PartnershipRef;
  createdAt?:     string;
  updatedAt?:     string;
}

// ── Detalhe (GET /v1/partnerships/{id}) ───────────────────────────────────────

export interface PartnershipDetail {
  id:                    number;
  title?:                string | null;
  manager?:              string | null;
  startDate?:            string | null;
  endDate?:              string | null;
  signatureDate?:        string | null;
  adminProcessNumber?:   string | null;
  termNumber?:           string | null;
  dispensationNumber?:   string | null;
  validationType?:       string | null;
  municipalValue?:       number | null;
  stateValue?:           number | null;
  federalValue?:         number | null;
  municipalSource?:      string | null;
  stateSource?:          string | null;
  federalSource?:        string | null;
  municipalAccount?:     string | null;
  stateAccount?:         string | null;
  federalAccount?:       string | null;
  totalValue?:           number | null;
  object?:               string | null;
  hideTransparency?:     boolean | null;
  accountRenderingQty?:  number | null;
  analysisDaysQty?:      number | null;
  monitoringCommission?: string | null;
  authorizedLaw?:        string | null;
  parliamentaryExemplar?: string | null;
  status?:               PartnershipStatus;
  contractingType?:      string | null;
  department?:           string | null;
  grantorId?:            number | null;
  entityId?:             number | null;
  responsibles?:         { type: string; name: string }[] | null;
  payables?:             { installment: number; dueDate: string; value: number }[] | null;
  annexes?:              { printDate?: string | null; deadlineDate?: string | null; validationType?: string | null }[] | null;
}

// ── Sub-payloads ──────────────────────────────────────────────────────────────

export interface PartnershipResponsiblePayload {
  type: string;
  name: string;
}

export interface PartnershipPayablePayload {
  installment: number;
  dueDate:     string;
  value:       number;
}

export interface PartnershipAnnexPayload {
  printDate?:      string;
  deadlineDate?:   string;
  validationType?: string;
}

// ── Payload de criação/atualização ────────────────────────────────────────────

export interface PartnershipPayload {
  title:                 string;
  manager?:              string;
  startDate?:            string;
  endDate?:              string;
  signatureDate?:        string;
  adminProcessNumber?:   string;
  termNumber?:           string;
  dispensationNumber?:   string;
  validationType?:       string;
  municipalValue?:       number;
  stateValue?:           number;
  federalValue?:         number;
  municipalSource?:      string;
  stateSource?:          string;
  federalSource?:        string;
  municipalAccount?:     string;
  stateAccount?:         string;
  federalAccount?:       string;
  totalValue?:           number;
  object?:               string;
  hideTransparency?:     boolean;
  accountRenderingQty?:  number;
  analysisDaysQty?:      number;
  monitoringCommission?: string;
  authorizedLaw?:        string;
  parliamentaryExemplar?: string;
  status?:               PartnershipStatus;
  contractingType?:      string;
  department?:           string;
  grantorId:             number;
  entityId:              number;
  responsibles:          PartnershipResponsiblePayload[];
  payables:              PartnershipPayablePayload[];
  annexes?:              PartnershipAnnexPayload[];
}

export type PartnershipUpdatePayload = Partial<PartnershipPayload>;

// ── ViewModel da listagem (mapeado da entidade p/ as colunas da tabela) ───────

export interface PartnershipRow {
  id:            number;
  displayId:     string;
  client:        string;
  contractName:  string;
  contractCode:  string;
  description:   string;
  approvedValue: string;
  receivedValue: string;
  balance:       string;
  status:        PartnershipStatus | '';
}

// ── Config de status (badge) ──────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const PARTNERSHIP_STATUS_CONFIG: Record<string, StatusConfig> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Pending:  { label: 'Pendente', variant: 'neutral' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
};
