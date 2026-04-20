// src/app/features/employees/employees.model.ts
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type EmployeeType = 'COLABORADOR' | 'DIRIGENTE';

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  role: string;
  type: string;
  entity: string;
  status: EmployeeStatus; // Usado apenas para o filtro, não renderizado na tabela
}