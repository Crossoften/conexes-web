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

// ── Entidade (resposta da API) ────────────────────────────────────────────────

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
