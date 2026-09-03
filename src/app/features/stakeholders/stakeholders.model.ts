// src/app/features/stakeholders/stakeholders.model.ts

// ── Enums / union types ───────────────────────────────────────────────────────

export type StakeholderView   = 'suppliers' | 'clients';
export type StakeholderType   = 'Supplier' | 'Customer' | 'Donor' | 'SupportedProject' | 'Other';
export type StakeholderStatus = 'Active' | 'Inactive' | 'Pending';
export type PersonType        = 'PF' | 'PJ' | 'Other';
export type AccountType       = 'Checking' | 'Savings' | 'Salary' | 'Payment';
export type PixType           = 'CPF' | 'CNPJ' | 'Email' | 'Phone' | 'RandomKey';
export type PaymentMethod     =
  | 'EletronicTransferSameOwner'
  | 'EletronicTransferOtherOwner'
  | 'TEDSameOwner'
  | 'TEDOtherOwner'
  | 'DOCSameOwner'
  | 'DOCOtherOwner'
  | 'BoletoSameBank'
  | 'BoletoOtherBank'
  | 'UtilityBill'
  | 'DARFWithBarcode'
  | 'GARE'
  | 'SP_ICMS'
  | 'GNRE_StateTaxes'
  | 'GPS'
  | 'FGTS'
  | 'IPVA'
  | 'DPVAT'
  | 'DARFWithoutBarcode'
  | 'IPTU'
  | 'INSS_MunicipalTaxes'
  | 'PIX';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface StakeholderAddress {
  zipCode:    string;
  street:     string;
  number:     string;
  complement: string;
  district:   string;
  city:       string;
  state:      string;
  isBilling?: boolean;   // FE-S6: endereço de faturamento (exclusivo de clientes)
}

// FE-S6: tipos considerados "cliente" (têm endereço de faturamento).
export const CLIENT_TYPES: StakeholderType[] = ['Customer', 'Donor', 'SupportedProject'];

export interface StakeholderBankData {
  accountName:     string;
  accountDocument: string;
  bank:            string;
  agency:          string;
  agencyDigit:     string;
  account:         string;
  accountDigit:    string;
  accountType:     AccountType;
  pixType:         PixType;
  pixKey:          string;
  paymentMethod:   PaymentMethod;
}

export interface StakeholderRiskClassification {
  privacyEvaluated:         boolean;
  privacyEvalDate:          string | null;
  privacyRisk:              string;
  privacyObservations:      string;
  complianceKypInitialDate: string | null;
  complianceKypFinalDate:   string | null;
  complianceRisk:           string;
  complianceObservations:   string;
}

export interface StakeholderContact {
  name:        string;
  email:       string;
  phone:       string;
  cellphone:   string;
  position:    string;
  observation: string;
}

// Serviço vinculado ao fornecedor — item do array `services` do contrato
// (CreateStakeholderServiceDto). Substitui os campos flat `service*` antigos.
export interface StakeholderService {
  name:          string;
  description:   string;
  externalCode:  string;
  grantorOrgan:  string;
  hasRetention:  boolean;
  accessorOrgan: string;
}

export interface StakeholderTaxesAndServices {
  serviceClassCode:     string;
  serviceTitle:         string;
  operationNature:      string;
  totalRetentions:      number;
  manualAliquots?:      boolean;   // FE-S5: alíquotas manuais (contrato novo)
  irfAliquot:           number;
  irfCode:              string;
  pisAliquot:           number;
  pisCode:              string;
  pccAliquot:           number;
  pccCode:              string;
  cofinsAliquot:        number;
  cofinsCode:           string;
  inssAliquot:          number;
  inssCode?:            string;    // FE-S5
  csllAliquot:          number;
  csllCode?:            string;    // FE-S5
  issAliquot?:          number;    // FE-S5 (ISS não existia no contrato antigo)
  issCode?:             string;    // FE-S5
  ibsAliquot:           number;
  ibsCode?:             string;    // FE-S5
  cbsAliquot:           number;
  cbsCode?:             string;    // FE-S5
  services:             StakeholderService[];   // contrato: array (era flat service*)
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Stakeholder {
  id:                    number;
  code:                  string;
  type:                  StakeholderType;
  supplierType?:         string;
  personType:            PersonType;
  document:              string;
  name:                  string;
  tradeName:             string;
  email:                 string;
  phone:                 string;
  status:                StakeholderStatus;
  stateRegistration:     string;
  municipalRegistration: string;
  mainActivity:          string;
  secondaryActivity:     string;
  legalNature:           string;
  standardApportionment: string;
  accountId:             number;
  // CF-06: vínculos opcionais de rateio (Centro de custo / Projeto / Atividade)
  rateioCostCenterId?:   number | null;
  rateioProjectId?:      number | null;
  rateioActivityId?:     number | null;
  addresses:             StakeholderAddress[];
  bankData:              StakeholderBankData[];
  riskClassification:    StakeholderRiskClassification;
  contacts:              StakeholderContact[];
  // FORN-fix: dados fiscais são geridos só na tela de Tributos e retenções — o
  // cadastro de fornecedor não escreve mais este bloco (opcional na resposta).
  taxesAndServices?:     StakeholderTaxesAndServices;
  createdAt:             string;
  updatedAt:             string;
}

// ── Model resumido para listagem ──────────────────────────────────────────────

export interface StakeholderListItem {
  id:         number;
  code:       string;
  personType: PersonType;
  document:   string;
  name:       string;
  tradeName?: string;               // FE-S2: nome fantasia (StakeholderListItemDto)
  status:     StakeholderStatus;
  type:       StakeholderType;
}

// ── Payload de criação / edição ───────────────────────────────────────────────

export type StakeholderPayload = Omit<Stakeholder, 'id' | 'createdAt' | 'updatedAt'>;

// ── Filtros da listagem ───────────────────────────────────────────────────────

export interface StakeholderFilters {
  name?:       string;
  document?:   string;
  personType?: PersonType | '';
  status?:     StakeholderStatus | '';
  type?:       string;              // FE-S2: um ou mais tipos separados por vírgula
  sort?:       string;              // FE-S3: ordenação server-side (ex: name, code, status)
  order?:      'asc' | 'desc';
  take?:       number;
  skip?:       number;
}

// ── Resposta paginada ─────────────────────────────────────────────────────────
// FE-S1: envelope oficial do back (ResponseFindAllStakeholderDto) = { data, count, pages }.

export interface StakeholderListResponse {
  data:  StakeholderListItem[];
  count: number;
  pages: number;
}

// ── Dados da Receita Federal (endpoint /cnpj/:cnpj) ──────────────────────────
// FE-S4: espelha o CnpjLookupResponseDto do back (só estes campos existem).

export interface CnpjData {
  cnpj:                string;
  razaoSocial?:        string;   // → name
  nomeFantasia?:       string;   // (sem campo de destino no form hoje)
  logradouro?:         string;   // → addresses[0].street
  numero?:             string;   // → addresses[0].number
  complemento?:        string;   // → addresses[0].complement
  bairro?:             string;   // → addresses[0].district
  municipio?:          string;   // → addresses[0].city
  uf?:                 string;   // → addresses[0].state
  cep?:                string;   // → addresses[0].zipCode
  email?:              string;
  telefone?:           string;   // → phone
  situacaoCadastral?:  string;   // situação cadastral na Receita
  atividadePrincipal?: string;   // → mainActivity
}

// ── Importação em lote (FE-S7) ────────────────────────────────────────────────

export interface ImportError {
  row:     number;
  field?:  string;
  message: string;
}

export interface ImportBatchSummary {
  batchId:    number;
  fileName:   string;
  total:      number;
  success:    number;
  failed:     number;
  errors:     ImportError[];
  createdAt?: string;
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'warning' | 'neutral';
}

export const STAKEHOLDER_STATUS_CONFIG: Record<StakeholderStatus, StatusConfig> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
  Pending:  { label: 'Pendente', variant: 'warning'  },
};

export const STAKEHOLDER_TYPE_LABELS: Record<StakeholderType, string> = {
  Supplier:         'Fornecedor',
  Customer:         'Cliente',
  Donor:            'Doador',
  SupportedProject: 'Projeto Apoiado',
  Other:            'Outros',
};

export const VIEW_TYPES: Record<StakeholderView, StakeholderType[]> = {
  suppliers: ['Supplier', 'Other'],
  clients:   ['Customer', 'Donor', 'SupportedProject'],
};

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  PF:    'Pessoa Física',
  PJ:    'Pessoa Jurídica',
  Other: 'Outro',
};
