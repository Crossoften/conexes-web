// src/app/features/agencies/agencies.model.ts

export type AgencyStatus = 'Active' | 'Inactive';
export type AgencyType   = 'PUBLIC' | 'PRIVATE';

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
  managingOrgan: string;
  phone:         string;
  email:         string;
  logo:          string;
  staff:         AgencyStaff[];
  status?:       AgencyStatus;
  createdAt?:    string;
  updatedAt?:    string;
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
  managingOrgan: string;
  phone:         string;
  email:         string;
  logo:          string;
  staff:         AgencyStaff[];
}

// ── Payload de atualização (PATCH — todos opcionais) ──────────────────────────

export type AgencyUpdatePayload = Partial<AgencyPayload>;

// ── Labels e configs de UI ────────────────────────────────────────────────────

export interface StatusConfig {
  label:   string;
  variant: 'success' | 'danger' | 'neutral';
}

export const AGENCY_STATUS_CONFIG: Record<string, StatusConfig> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};