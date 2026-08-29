// src/app/features/agencies/agencies.model.ts

export type AgencyStatus = 'Active' | 'Pending' | 'Inactive';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface AgencyStaff {
  serverType:         string;
  jobTitle:           string;
  name:               string;
  appointmentAct:     string;
  birthDate:          string;
  rg:                 string;
  cpf:                string;
  phone:              string;
  zipCode:            string;
  address:            string;
  number:             string;
  complement:         string;
  institutionalEmail: string;
  personalEmail:      string;
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Agency {
  id:            number;
  cnpj:          string;
  legalName:     string;
  tradeName:     string;
  emancipation:  string;
  zipCode:       string;
  address:       string;
  number:        string;
  complement:    string;
  managingOrgan:    string;
  phone:            string;
  email:            string;
  logo:             string;
  /** @deprecated CV-02: o link do Portal da Transparência agora é gerado automaticamente
   *  pelo front (AgenciesService.buildTransparencyUrl), não mais cadastrado à mão. */
  transparencyUrl?: string;
  staff:            AgencyStaff[];
  status?:          AgencyStatus;
  createdAt?:       string;
  updatedAt?:       string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface AgencyPayload {
  cnpj:          string;
  legalName:     string;
  tradeName:     string;
  emancipation:  string | null;
  zipCode:       string;
  address:       string;
  number:        string;
  complement:    string;
  managingOrgan:    string;
  phone:            string;
  email?:           string;
  logo:             string;
  status?:          AgencyStatus;
  staff:            AgencyStaff[];
}

// ── Payload de atualização (PATCH — todos opcionais) ──────────────────────────

export type AgencyUpdatePayload = Partial<AgencyPayload>;

// ── Labels e configs de UI ────────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const AGENCY_STATUS_CONFIG: Record<string, StatusConfig> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Pending:  { label: 'Pendente', variant: 'neutral' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
};

// Tipo de Servidor (staff) — valores fixos conforme documento do cliente.
export const AGENCY_SERVER_TYPE_OPTIONS: string[] = [
  'Gestor de Parceria',
  'Comissão de Seleção',
  'Comissão de Monitoramento e Avaliação',
  'Prefeito',
  'Responsável Atendimento',
  'Gestor do Órgão',
];