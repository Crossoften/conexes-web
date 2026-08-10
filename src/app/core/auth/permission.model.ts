// src/app/core/auth/permission.model.ts
//
// Modelo leve de permissões no core (independente das features).
// Reflete a matriz módulo × ação usada pelo cadastro de usuários/perfis.

export type PermissionAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

export interface ModulePermission {
  module:       string;
  subMenu?:     string;
  canView:      boolean;
  canCreate:    boolean;
  canEdit:      boolean;
  canDelete:    boolean;
  isUnlimited:  boolean;
}

/** Chaves oficiais dos 6 grupos de módulo (iguais ao DEFAULT_MODULES do cadastro). */
export const PERMISSION_MODULES = {
  REGISTRATION:   'Gestão de cadastro',
  ENTITIES:       'Entidades',
  CONTRACTS:      'Contratos e parcerias',
  PURCHASING:     'Suprimentos/compras',
  FINANCIAL:      'Financeiro',
  ACCOUNTABILITY: 'Prestação de contas',
} as const;

/** Rota "inicial" de cada módulo — usada como destino/fallback do guard. */
export const MODULE_HOME: Record<string, string> = {
  [PERMISSION_MODULES.REGISTRATION]:   '/stakeholders',
  [PERMISSION_MODULES.ENTITIES]:       '/entity-registry',
  [PERMISSION_MODULES.CONTRACTS]:      '/agencies',
  [PERMISSION_MODULES.PURCHASING]:     '/purchasing-management',
  [PERMISSION_MODULES.FINANCIAL]:      '/financial-transfers',
};

/** Normaliza o nome do módulo (tolerante a caixa/espaços do back). */
export function normalizeModule(name: string): string {
  return (name ?? '').toString().trim().toLowerCase();
}
