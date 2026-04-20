// src/app/features/users/users.mock.ts
import { User } from './users.model';

export const USERS_MOCK: User[] = Array.from({ length: 25 }, (_, i) => ({
  id: `usr-${i + 1}`,
  name: 'Amanda Souza Silva',
  company: 'INSTITUTO DE GESTAO ESTRATEGICA',
  login: 'LOGIN',
  email: 'mail@mail.com',
  permissions: '12 - JURIDICO',
  status: i % 6 === 0 ? 'INACTIVE' : 'ACTIVE', // Simula alguns inativos
}));