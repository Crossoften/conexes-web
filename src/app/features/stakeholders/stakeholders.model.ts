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
}

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

export interface StakeholderTaxesAndServices {
  serviceClassCode:     string;
  serviceTitle:         string;
  operationNature:      string;
  totalRetentions:      number;
  irfAliquot:           number;
  irfCode:              string;
  pisAliquot:           number;
  pisCode:              string;
  pccAliquot:           number;
  pccCode:              string;
  cofinsAliquot:        number;
  cofinsCode:           string;
  inssAliquot:          number;
  csllAliquot:          number;
  ibsAliquot:           number;
  cbsAliquot:           number;
  serviceName:          string;
  serviceDescription:   string;
  serviceExternalCode:  string;
  serviceGrantorOrgan:  string;
  serviceHasRetention:  boolean;
  serviceAccessorOrgan: string;
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Stakeholder {
  id:                    number;
  code:                  string;
  type:                  StakeholderType;
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
  addresses:             StakeholderAddress[];
  bankData:              StakeholderBankData[];
  riskClassification:    StakeholderRiskClassification;
  contacts:              StakeholderContact[];
  taxesAndServices:      StakeholderTaxesAndServices;
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
  take?:       number;
  skip?:       number;
}

// ── Resposta paginada ─────────────────────────────────────────────────────────

export interface StakeholderListResponse {
  data:  StakeholderListItem[];
  total: number;
}

// ── Dados da Receita Federal (endpoint /cnpj/:cnpj) ──────────────────────────
// Mapeie apenas os campos que o back retorna; adicione mais conforme necessário.

export interface CnpjData {
  cnpj:                 string;
  razaoSocial:          string;   // → name / tradeName
  nomeFantasia:         string;   // → tradeName
  email:                string;
  telefone:             string;   // → phone
  naturezaJuridica:     string;   // → legalNature
  atividadePrincipal:   string;   // → mainActivity
  atividadeSecundaria?: string;   // → secondaryActivity
  inscricaoEstadual?:   string;   // → stateRegistration
  logradouro?:          string;   // → addresses[0].street
  numero?:              string;   // → addresses[0].number
  complemento?:         string;   // → addresses[0].complement
  bairro?:              string;   // → addresses[0].district
  municipio?:           string;   // → addresses[0].city
  uf?:                  string;   // → addresses[0].state
  cep?:                 string;   // → addresses[0].zipCode
  situacao?:            string;   // pode mapear p/ status se útil
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
