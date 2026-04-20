// src/app/features/purchasing-registries/purchasing-registries.model.ts
export type RegistryTab = 'PRODUCTS' | 'SUPPLIERS' | 'COST_CENTERS' | 'LOCATIONS';
export type RegistryStatus = 'ACTIVE' | 'INACTIVE';

export interface Product {
  id: string;
  code: string;
  productName: string;
  measureType: string;
  group: string;
  description: string;
  status: RegistryStatus;
}

export interface Supplier {
  id: string;
  cnpj: string;
  legalName: string;
  contact: string;
  email: string;
}

export interface CostCenter {
  id: string;
  name: string;
  address: string;
}

export interface DeliveryLocation {
  id: string;
  name: string;
  address: string;
}