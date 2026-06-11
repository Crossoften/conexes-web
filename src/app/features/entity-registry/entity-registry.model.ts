// src/app/features/entity-registry/entity-registry.model.ts

export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type EntityType   = 'PF' | 'PJ';

// ── Payload de criação / edição (POST e PATCH) ────────────────────────────
export interface EntityRegistryPayload {
  cnpj:                  string;
  legalName:             string;
  tradeName:             string;
  stateRegistration?:    string;
  constitutionDate?:     string;
  zipCode:               string;
  address:               string;
  number:                string;
  complement?:           string;
  city:                  string;
  state:                 string;
  mainPhone:             string;
  cellPhone:             string;
  directorEmail:         string;
  digitalCertPassword?:  string;
  logoUrl?:              string;
  accountantName:        string;
  accountantCpf:         string;
  accountantCrc:         string;
  accountantZipCode:     string;
  accountantAddress:     string;
  accountantNumber:      string;
  accountantComplement?: string;
  accountantPhone:       string;
  accountantEmail:       string;
  accountantOffice:      string;
  accountantOfficePhone: string;
}

// ── Entidade completa retornada pelo GET /{id} ────────────────────────────
export interface EntityRegistry extends EntityRegistryPayload {
  id:      number;
  status:  EntityStatus;
  type:    EntityType;
  children?: EntityRegistry[];
}

// ── Shape mínimo do GET /entities (listagem) ──────────────────────────────
export interface EntityRegistryListItem {
  id:        number;
  cnpj:      string;
  legalName: string;
  tradeName: string;
  city:      string;
  status:    EntityStatus;
  type:      EntityType;
}

// ── Helpers de label / badge ──────────────────────────────────────────────
export const ENTITY_STATUS_CONFIG: Record<EntityStatus, { label: string; variant: string }> = {
  ACTIVE:   { label: 'Ativo',   variant: 'success' },
  INACTIVE: { label: 'Inativo', variant: 'neutral' },
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  PF: 'Pessoa Física',
  PJ: 'Pessoa Jurídica',
};
