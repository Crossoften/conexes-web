// src/app/features/employees/employees.model.ts

// `responsibleType` é o discriminador Colaborador × Dirigente. O back o expõe como
// ENUM com valores canônicos `Colaborador`/`Dirigente` (antes o front mandava
// COLABORADOR/DIRIGENTE — mismatch corrigido no Lote A).
export type EmployeeType   = 'Colaborador' | 'Dirigente';

// O back passou a expor `status` no colaborador.
export type EmployeeStatus = 'Active' | 'Pending' | 'Inactive';

// ── Model completo (resposta da API) ──────────────────────────────────────────

export interface Employee {
  id:                 number;
  entityId:           number;
  name:               string;
  cpf:                string;
  email:              string;
  phone:              string;
  cellPhone:          string;
  status:             EmployeeStatus;
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
  status?:            EmployeeStatus;
  title:              string;
  responsibleType:    string;
  positionId:         number;
  formation:          string;
  linkType:           string;
  workingHours:       number;
  startDate:          string | null;   // ISO 8601 ou null (o back rejeita '' e exige ISO)
  endDate:            string | null;
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

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const EMPLOYEE_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Pending:  { label: 'Pendente', variant: 'neutral' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
};

export const EMPLOYEE_STATUS_OPTIONS: { label: string; value: EmployeeStatus }[] = [
  { label: 'Ativo',    value: 'Active'   },
  { label: 'Pendente', value: 'Pending'  },
  { label: 'Inativo',  value: 'Inactive' },
];

// ── Pagamentos recebidos (GET /collaborators/{id}/payments) ────────────────────
// A resposta não tem schema no Swagger — normalizada de forma tolerante no service.
export interface EmployeePayment {
  competence: string;   // competência (mês/ano de referência)
  date:       string;   // data do pagamento
  value:      number;   // valor
}