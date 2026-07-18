// src/app/features/employees/employees.model.ts

// Obs.: `status` NÃO existe no contrato `/v1/institutional/collaborators` — removido
// do front até o Back definir (B-CO-04). A distinção Colaborador × Dirigente usa
// `responsibleType` (COLABORADOR/DIRIGENTE), que é campo real do DTO.
export type EmployeeType   = 'COLABORADOR' | 'DIRIGENTE';

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Employee {
  id:                 number;
  entityId:           number;
  name:               string;
  cpf:                string;
  email:              string;
  phone:              string;
  cellPhone:          string;
  title:              string;
  responsibleType:    string;
  positionId:         number;
  formation:          string;
  linkType:           string;
  workingHours:       number;
  startDate:          string;
  endDate:            string;
  cns:                string;
  salary:             number;
  professionalBoard:  string;
  personalEmail:      string;
  institutionalEmail: string;
  zipCode:            string;
  address:            string;
  number:             string;
  complement:         string;
  partnershipId:      number;
  resourceOrigin:     string;
  reference:          string;
  grossValue:         number;
  createdAt?:         string;
  updatedAt?:         string;
}

// ── Payload de criação ────────────────────────────────────────────────────────

export interface EmployeePayload {
  entityId:           number;
  name:               string;
  cpf:                string;
  email:              string;
  phone:              string;
  cellPhone:          string;
  title:              string;
  responsibleType:    string;
  positionId:         number;
  formation:          string;
  linkType:           string;
  workingHours:       number;
  startDate:          string;
  endDate:            string;
  cns:                string;
  salary:             number;
  professionalBoard:  string;
  personalEmail:      string;
  institutionalEmail: string;
  zipCode:            string;
  address:            string;
  number:             string;
  complement:         string;
  partnershipId:      number;
  resourceOrigin:     string;
  reference:          string;
  grossValue:         number;
}

// ── Payload de atualização (PATCH — todos os campos opcionais) ─────────────────

export type EmployeeUpdatePayload = Partial<EmployeePayload>;