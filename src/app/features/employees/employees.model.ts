// src/app/features/employees/employees.model.ts

export type EmployeeStatus = 'Active' | 'Inactive';
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
  status?:            EmployeeStatus;
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
