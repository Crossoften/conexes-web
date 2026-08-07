// src/app/features/users/users.model.ts

export type UserStatus = 'Active' | 'Inactive' | 'Pending';
export type UserRole = 'Master' | 'Admin' | 'Backoffice' | 'EntityManager' | 'ProcurementManager' | 'Finance' | 'Operational';

// ── Paginação ─────────────────────────────────────────────────────────────────

// Envelope oficial das listagens do back: { data, count, pages }.
export interface PaginatedResponse<T> {
  data:  T[];
  count: number;
  pages: number;
}

// ── Permissão de módulo (usada em user e em profile) ──────────────────────────

export interface ModulePermission {
  module:      string;
  subMenu:     string;
  canView:     boolean;
  canCreate:   boolean;
  canEdit:     boolean;
  canDelete:   boolean;
  isUnlimited: boolean;
}

// ── Permission Profile (/v1/permission-profiles) ──────────────────────────────

export interface PermissionProfile {
  id:          number;
  name:        string;
  description: string;
  permissions: ModulePermission[];
  createdAt?:  string;
  updatedAt?:  string;
}

export interface PermissionProfilePayload {
  name:        string;
  description: string;
  permissions: ModulePermission[];
}

export interface PermissionProfileUpdatePayload {
  name?:        string;
  description?: string;
  permissions?: ModulePermission[];
}

export interface PermissionProfileFilters {
  skip?:  number;
  take?:  number;
  name?:  string;
}

// ── User (/v1/users) ──────────────────────────────────────────────────────────

export interface User {
  id:                  number;
  name:                string;
  surname:             string;
  username?:           string;   // login
  email:               string;
  document:            string;
  jobTitle:            string;
  area:                string;
  phone:               string;
  role:                UserRole | string;
  status:              UserStatus;
  entityId?:           number;   // empresa/entidade vinculada
  permissionProfileId?: number;
  modulePermissions:   ModulePermission[];
  /** BK-3: permissões efetivas (perfil + diretas), calculadas pelo back. */
  effectivePermissions?: ModulePermission[];
  /** BK-3: perfil de permissão vinculado (nome + matriz do perfil). */
  permissionProfile?:  { id: number; name: string; description?: string; permissions?: ModulePermission[] };
  createdAt?:          string;
  updatedAt?:          string;
}

/** Item resumido de entidade (/v1/institutional/entities) para o select. */
export interface EntityLite {
  id:         number;
  legalName?: string;
  tradeName?: string;
  cnpj?:      string;
  city?:      string;
}

export interface UserFilters {
  skip?:   number;
  take?:   number;
  role?:   string;
  name?:   string;
  status?: string;   // filtro server-side (GET /v1/users aceita status)
}

export interface UserPayload {
  name:                 string;
  surname:              string;
  username?:            string;
  email:                string;
  document:             string;
  jobTitle:             string;
  area:                 string;
  phone:                string;
  role?:                string;
  status:               UserStatus;
  password?:            string;
  entityId?:            number;
  permissionProfileId?: number;
  modulePermissions?:   ModulePermission[];
}

export interface UserUpdatePayload {
  name?:                string;
  surname?:             string;
  username?:            string;
  email?:               string;
  document?:            string;
  jobTitle?:            string;
  area?:                string;
  phone?:               string;
  role?:                string;
  status?:              UserStatus;
  password?:            string;
  entityId?:            number;
  permissionProfileId?: number;
  modulePermissions?:   ModulePermission[];
}

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const USER_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:  { label: 'Ativo',    variant: 'success' },
  Inactive:{ label: 'Inativo',  variant: 'danger'  },
  Pending: { label: 'Pendente', variant: 'neutral'  },
};

export const USER_ROLE_LABELS: Record<string, string> = {
  Master:             'Master',
  Admin:              'Admin',
  Backoffice:         'Backoffice',
  EntityManager:      'Gestor de Entidades',
  ProcurementManager: 'Gestor de Compras',
  Finance:            'Financeiro',
  Operational:        'Operacional',
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