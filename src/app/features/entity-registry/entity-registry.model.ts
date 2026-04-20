// src/app/features/entity-registry/entity-registry.model.ts
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type EntityType = 'PF' | 'PJ';

export interface EntityRegistry {
  id: string;
  cnpj: string; // CNPJ ou CPF
  legalName: string; // Razão Social
  tradeName: string; // Nome fantasia
  city: string;
  status: EntityStatus;
  type: EntityType;
  children?: any[]; // Propriedade para suportar a expansão da linha
}