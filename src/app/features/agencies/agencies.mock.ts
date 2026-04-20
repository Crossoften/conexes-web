// src/app/features/agencies/agencies.mock.ts
import { Agency } from './agencies.model';

export const AGENCIES_MOCK: Agency[] = Array.from({ length: 25 }, (_, i) => ({
  id: `agency-${i + 1}`,
  name: 'Exemplo nome',
  cnpj: '000000000',
  city: 'SÃO LUIS',
  state: 'SP',
  status: i % 5 === 0 ? 'INACTIVE' : 'ACTIVE', // Status simulado
  type: i % 2 === 0 ? 'PUBLIC' : 'PRIVATE', // Tipo simulado
}));