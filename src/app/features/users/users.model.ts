// src/app/features/users/users.model.ts

export type UserStatus = 'Active' | 'Inactive';
export type UserRole   = 'Master' | 'Admin' | 'Manager' | 'Operator' | 'Viewer';

// ── Paginação ─────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  skip:  number;
  take:  number;
}

// ── Permissões de módulo ──────────────────────────────────────────────────────

export interface ModulePermission {
  module:      string;
  subMenu:     string;
  canView:     boolean;
  canCreate:   boolean;
  canEdit:     boolean;
  canDelete:   boolean;
  isUnlimited: boolean;
}

// ── Permission (entidade standalone /v1/permissions) ──────────────────────────

export interface Permission {
  id:          number;
  userId:      number;
  module:      string;
  subMenu:     string;
  canView:     boolean;
  canCreate:   boolean;
  canEdit:     boolean;
  canDelete:   boolean;
  isUnlimited: boolean;
  createdAt?:  string;
  updatedAt?:  string;
}

export interface PermissionPayload {
  userId:      number;
  module:      string;
  subMenu:     string;
  canView:     boolean;
  canCreate:   boolean;
  canEdit:     boolean;
  canDelete:   boolean;
  isUnlimited: boolean;
}

export type PermissionUpdatePayload = Partial<Omit<PermissionPayload, 'userId'>>;

// ── Filtros de permissions ────────────────────────────────────────────────────

export interface PermissionFilters {
  skip?:   number;
  take?:   number;
  module?: string;
  userId?: number;
}

// ── User (resposta da API) ────────────────────────────────────────────────────

export interface User {
  id:                number;
  name:              string;
  surname:           string;
  email:             string;
  document:          string;
  jobTitle:          string;
  area:              string;
  phone:             string;
  role:              UserRole | string;
  status:            UserStatus;
  modulePermissions: ModulePermission[];
  createdAt?:        string;
  updatedAt?:        string;
}

// ── Filtros de users ──────────────────────────────────────────────────────────

export interface UserFilters {
  skip?:  number;
  take?:  number;
  role?:  string;
  name?:  string;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface UserPayload {
  name:              string;
  surname:           string;
  email:             string;
  document:          string;
  jobTitle:          string;
  area:              string;
  phone:             string;
  role:              string;
  status:            UserStatus;
  password:          string;
  modulePermissions: ModulePermission[];
}

export interface UserUpdatePayload {
  name?:              string;
  surname?:           string;
  email?:             string;
  document?:          string;
  jobTitle?:          string;
  area?:              string;
  phone?:             string;
  role?:              string;
  status?:            UserStatus;
  password?:          string;
  modulePermissions?: ModulePermission[];
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const USER_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};

export const USER_ROLE_LABELS: Record<string, string> = {
  Master:   'Master',
  Admin:    'Admin',
  Manager:  'Gerente',
  Operator: 'Operador',
  Viewer:   'Viewer',
};

// ── Módulos padrão ────────────────────────────────────────────────────────────

export const DEFAULT_MODULES: ModulePermission[] = [
  { module: 'Gestão de cadastro',    subMenu: 'Stakeholders, Plano de contas', canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Contratos e parcerias', subMenu: 'Órgãos, Planos de trabalho',   canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Entidades',             subMenu: 'Entidades, Contas bancárias',   canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Suprimentos/compras',   subMenu: 'Cotações, Compras',             canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Financeiro',            subMenu: 'Conciliação, Contas a receber', canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Prestação de contas',   subMenu: 'Relatórios, Documentos',        canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
];