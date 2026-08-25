// src/app/features/purchasing-registries/purchasing-registries.model.ts
import { PurchaseStatusConfig } from '../purchases/purchases.model';

export type RegistryTab = 'PRODUCTS' | 'SERVICES' | 'SUPPLIERS' | 'COST_CENTERS' | 'LOCATIONS';
export type RegistryStatus = 'Active' | 'Pending' | 'Inactive';

// ── View models (linhas das tabelas) ─────────────────────────────────────────

export interface Product {
  id:          string;
  apiId:       number;
  code:        string;
  productName: string;
  measureType: string;
  group:       string;
  manufacturer: string;
  description: string;
  status:      RegistryStatus;
}

export interface Supplier {
  id:        string;
  apiId:     number;
  cnpj:      string;
  legalName: string;
  contact:   string;
  email:     string;
}

export interface CostCenter {
  id:      string;
  apiId:   number;
  name:    string;
  address: string;
}

export interface DeliveryLocation {
  id:      string;
  apiId:   number;
  name:    string;
  address: string;
}

// ── Respostas da API (campos usados) ──────────────────────────────────────────

export interface ApiProductService {
  id:            number;
  code?:         string | null;
  name:          string;
  type?:         string | null;
  manufacturer?: string | null;
  group?:        string | null;
  groupId?:        number | null;
  manufacturerId?: number | null;
  productGroup?:   { name: string } | null;
  manufacturerRef?: { name: string } | null;
  measure?:      string | null;
  costBase?:     number | null;
  origin?:       string | null;
  accountPlanId?: number | null;
  description?:  string | null;
  status?:       RegistryStatus;
}

export interface ApiDeliveryLocation {
  id:           number;
  name:         string;
  responsible?: string | null;
  zipCode?:     string | null;
  address?:     string | null;
  number?:      string | null;
}

export interface ApiStakeholder {
  id:        number;
  document?: string | null;
  name:      string;
  tradeName?: string | null;
  email?:    string | null;
  phone?:    string | null;
}

export interface ApiProject {
  id:          number;
  code?:       string | null;
  name:        string;
  description?: string | null;
}

// ── Payloads (CRUD de produtos e locais — usados no passo 5b) ──────────────────

export interface ProductServicePayload {
  code?:         string;
  name:          string;
  type:          string; // 'Product' | 'Service'
  manufacturer?: string;
  group?:        string;
  groupId?:        number;
  manufacturerId?: number;
  measure?:      string;
  costBase?:     number;
  origin?:       string;
  accountPlanId?: number;
  description?:  string;
  status?:       RegistryStatus;
}

export interface DeliveryLocationPayload {
  name:         string;
  responsible?: string;
  zipCode?:     string;
  address?:     string;
  number?:      string;
  // CP-09: endereço estruturado (padrão RF)
  complement?:  string;
  district?:    string;
  city?:        string;
  state?:       string;
  email?:       string;
  phone?:       string;
}

// ── Status config ─────────────────────────────────────────────────────────────

export const REGISTRY_STATUS_CONFIG: Record<RegistryStatus, PurchaseStatusConfig> = {
  Active:   { label: 'Ativo',    variant: 'success' },
  Pending:  { label: 'Pendente', variant: 'warning' },
  Inactive: { label: 'Inativo',  variant: 'danger'  },
};
