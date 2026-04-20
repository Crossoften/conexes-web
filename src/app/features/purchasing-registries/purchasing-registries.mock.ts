// src/app/features/purchasing-registries/purchasing-registries.mock.ts
import { Product, Supplier, CostCenter, DeliveryLocation } from './purchasing-registries.model';

export const PRODUCTS_MOCK: Product[] = Array.from({ length: 25 }, (_, i) => ({
  id: `prod-${i + 1}`,
  code: '000000000',
  productName: i % 2 === 0 ? 'PAPEL SULFITE' : 'ACUCAR - PCT 100',
  measureType: 'Unidade',
  group: i % 2 === 0 ? 'Material escritório' : 'Material de copa',
  description: 'Exemplo descrição',
  status: 'ACTIVE',
}));

export const SUPPLIERS_MOCK: Supplier[] = Array.from({ length: 25 }, (_, i) => ({
  id: `sup-${i + 1}`,
  cnpj: '000000000',
  legalName: i % 2 === 0 ? 'LOGISTICA - ESTADIAS' : 'LOCACAO DE EQUIPAMENTO DE SOM/LUZ E GERADOR',
  contact: i % 2 === 0 ? 'Logística' : 'Locações',
  email: 'Exemplo descrição',
}));

export const COST_CENTERS_MOCK: CostCenter[] = Array.from({ length: 25 }, (_, i) => ({
  id: `cc-${i + 1}`,
  name: '000000000',
  address: i % 2 === 0 ? 'LOGISTICA - ESTADIAS' : 'LOCACAO DE EQUIPAMENTO DE SOM/LUZ E GERADOR',
}));

export const LOCATIONS_MOCK: DeliveryLocation[] = Array.from({ length: 25 }, (_, i) => ({
  id: `loc-${i + 1}`,
  name: '000000000',
  address: 'Exemplo de endereço de entrega',
}));