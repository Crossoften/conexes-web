// src/app/features/entity-registry/entity-registry.model.ts

// Obs.: `status`, `type` (PF/PJ) e hierarquia Entidade/Filial (children) NÃO existem
// no contrato `/v1/institutional/entities` — removidos do front até o Back definir
// (ver B-EN-04). PF/PJ não se aplica a entidade institucional (é sempre PJ/CNPJ).

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
  id: number;
}

// ── Shape mínimo do GET /entities (listagem) ──────────────────────────────
// Back retorna hoje só id/cnpj/legalName/city; tradeName aguarda B-EN-02.
export interface EntityRegistryListItem {
  id:        number;
  cnpj:      string;
  legalName: string;
  tradeName: string;
  city:      string;
}
