// src/app/features/entity-registry/entity-registry.mock.ts
import { EntityRegistry } from './entity-registry.model';

export const ENTITY_REGISTRY_MOCK: EntityRegistry[] = Array.from({ length: 25 }, (_, i) => ({
  id: `entity-${i + 1}`,
  cnpj: '000000000',
  legalName: i % 4 === 0 ? 'PF' : 'PJ',
  tradeName: 'IGEP',
  city: 'SÃO LUIS',
  status: i % 5 === 0 ? 'INACTIVE' : 'ACTIVE',
  type: i % 4 === 0 ? 'PF' : 'PJ',
  children: i % 3 === 0 ? [{ id: `child-${i}` }] : [], // Simula que algumas linhas têm detalhes para expandir
}));