// src/app/features/stakeholders/stakeholders.mock.ts
import { Stakeholder } from './stakeholders.model';

export const STAKEHOLDERS_MOCK: Stakeholder[] = [
  { id: '000000001', name: 'Tech Solutions Ltda',    document: '12.345.678/0001-99', type: 'SUPPLIER', status: 'ACTIVE',   email: 'contato@tech.com',    phone: '(11) 3333-4444', createdAt: '2025-01-10T10:00:00Z', updatedAt: '2025-03-01T10:00:00Z' },
  { id: '000000002', name: 'Distribuidora Sul S/A',   document: '33.444.555/0001-66', type: 'SUPPLIER', status: 'ACTIVE',   email: 'sul@distrib.com',     phone: '(41) 2222-1111', createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-03-05T10:00:00Z' },
  { id: '000000003', name: 'Construtora Norte Ltda',  document: '77.888.999/0001-11', type: 'SUPPLIER', status: 'ACTIVE',   email: 'norte@const.com',     phone: '(51) 3333-2222', createdAt: '2025-02-01T10:00:00Z', updatedAt: '2025-03-25T10:00:00Z' },
  { id: '000000004', name: 'Global Services S/A',     document: '98.765.432/0001-10', type: 'SUPPLIER', status: 'INACTIVE', email: 'global@services.com', phone: '(11) 2222-3333', createdAt: '2025-03-01T10:00:00Z', updatedAt: '2025-03-15T10:00:00Z' },
  { id: '000000005', name: 'Fundação Esperança',       document: '88.999.000/0001-22', type: 'OTHER',    status: 'INACTIVE', email: 'fundo@esp.org',       phone: '(11) 5555-6666', createdAt: '2024-10-01T10:00:00Z', updatedAt: '2025-01-20T10:00:00Z' },
  { id: '000000006', name: 'Instituto Futuro',         document: '44.555.666/0001-77', type: 'OTHER',    status: 'ACTIVE',   email: 'contato@futuro.org',  phone: '(11) 4444-5555', createdAt: '2025-01-05T10:00:00Z', updatedAt: '2025-03-20T10:00:00Z' },
  { id: '000000007', name: 'Ana Martins',              document: '123.456.789-00',     type: 'CLIENT',   status: 'ACTIVE',   email: 'ana@email.com',       phone: '(11) 9 9999-1111', createdAt: '2025-01-10T10:00:00Z', updatedAt: '2025-03-01T10:00:00Z' },
  { id: '000000008', name: 'Carlos Rocha',             document: '987.654.321-00',     type: 'CLIENT',   status: 'ACTIVE',   email: 'carlos@email.com',    phone: '(21) 9 8888-7777', createdAt: '2025-01-20T10:00:00Z', updatedAt: '2025-02-20T10:00:00Z' },
  { id: '000000009', name: 'Maria Silva',              document: '222.333.444-55',     type: 'CLIENT',   status: 'INACTIVE', email: 'maria@email.com',     phone: '(61) 9 5555-4444', createdAt: '2025-03-10T10:00:00Z', updatedAt: '2025-03-28T10:00:00Z' },
  { id: '000000010', name: 'João Pereira',             document: '666.777.888-99',     type: 'CLIENT',   status: 'ACTIVE',   email: 'joao@email.com',      phone: '(71) 9 4444-3333', createdAt: '2025-02-20T10:00:00Z', updatedAt: '2025-03-15T10:00:00Z' },
  { id: '000000011', name: 'Lucia Ferreira',           document: '111.222.333-44',     type: 'DONOR',    status: 'ACTIVE',   email: 'lucia@email.com',     phone: '(31) 9 7777-6666', createdAt: '2024-12-01T10:00:00Z', updatedAt: '2025-01-05T10:00:00Z' },
  { id: '000000012', name: 'Roberto Lima',             document: '555.666.777-88',     type: 'DONOR',    status: 'INACTIVE', email: 'roberto@email.com',   phone: '(41) 9 6666-5555', createdAt: '2024-11-01T10:00:00Z', updatedAt: '2025-02-01T10:00:00Z' },
];
