// src/app/features/employees/employees.mock.ts
import { Employee } from './employees.model';

export const EMPLOYEES_MOCK: Employee[] = Array.from({ length: 25 }, (_, i) => ({
  id: `emp-${i + 1}`,
  name: 'Exemplo nome',
  cpf: '0000000000000',
  role: 'Exemplo cargo',
  type: 'Exemplo cargo', // Conforme o mockup
  entity: 'Exemplo cargo', // Conforme o mockup
  status: i % 4 === 0 ? 'INACTIVE' : 'ACTIVE',
}));