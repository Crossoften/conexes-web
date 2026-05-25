// src/app/features/users/users.model.ts

export type UserStatus = 'Active' | 'Inactive';
export type UserRole   = 'Master' | 'Admin' | 'Manager' | 'Operator' | 'Viewer';

// ── Sub-modelos ───────────────────────────────────────────────────────────────

export interface ModulePermission {
  module:    string;
  subMenu:   string;
  canView:   boolean;
  canCreate: boolean;
  canEdit:   boolean;
  canDelete: boolean;
  isUnlimited: boolean;
}

// ── Model completo (resposta da API) ──────────────────────────────────────────

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

// ── Payload de criação ────────────────────────────────────────────────────────

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

// ── Labels e configs de UI ────────────────────────────────────────────────────

export const USER_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'neutral' }> = {
  Active:   { label: 'Ativo',   variant: 'success' },
  Inactive: { label: 'Inativo', variant: 'danger'  },
};

// Módulos padrão para a tabela de permissões
export const DEFAULT_MODULES: ModulePermission[] = [
  { module: 'Gestão de cadastro',    subMenu: 'Stakeholders, Plano de contas', canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Contratos e parcerias', subMenu: 'Órgãos, Planos de trabalho',   canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Entidades',             subMenu: 'Entidades, Contas bancárias',   canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Suprimentos/compras',   subMenu: 'Cotações, Compras',             canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Financeiro',            subMenu: 'Conciliação, Contas a receber', canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
  { module: 'Prestação de contas',   subMenu: 'Relatórios, Documentos',        canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false },
];
