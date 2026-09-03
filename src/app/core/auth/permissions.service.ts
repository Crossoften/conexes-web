// src/app/core/auth/permissions.service.ts
//
// PERM-fix (Fase B): camada única de decisão de permissão de MENU e ROTAS a partir
// do Perfil de Permissão do usuário logado (effectivePermissions, vindas de /my-self).
//
//  • Master faz BYPASS TOTAL — enxerga e faz tudo, ignorando a matriz de módulos.
//  • Enquanto as permissões não carregaram (lista vazia e não-Master), NEGA por
//    padrão para não vazar telas durante o bootstrap.
//  • Sem subMenu, a checagem é em nível de MÓDULO (qualquer subMenu com a ação).
//
// Os nomes de module/subMenu vêm do catálogo autoritativo do back
// (user-management.service.ts → modulesCatalog()). Ver layout/sidebar/permission-map.ts.

import { Injectable, inject } from '@angular/core';
import { AuthService, EffectivePermission } from './auth.service';

type PermissionAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private auth = inject(AuthService);

  /** Master enxerga e faz tudo — bypass total das permissões de módulo. */
  isMaster(): boolean {
    return this.auth.user()?.role === 'Master';
  }

  canView(module: string, subMenu?: string):     boolean { return this.can('canView', module, subMenu); }
  canCreate(module: string, subMenu?: string):    boolean { return this.can('canCreate', module, subMenu); }
  canEdit(module: string, subMenu?: string):      boolean { return this.can('canEdit', module, subMenu); }
  canDelete(module: string, subMenu?: string):    boolean { return this.can('canDelete', module, subMenu); }
  isUnlimited(module: string, subMenu?: string):  boolean { return this.can('isUnlimited', module, subMenu); }

  private permissions(): EffectivePermission[] {
    return this.auth.user()?.effectivePermissions ?? [];
  }

  private can(action: PermissionAction, module: string, subMenu?: string): boolean {
    if (this.isMaster()) return true;

    const perms = this.permissions();
    if (perms.length === 0) return false; // deny-by-default enquanto não carregou

    if (subMenu) {
      const row = perms.find(p => p.module === module && p.subMenu === subMenu);
      return !!row?.[action];
    }

    // Nível de módulo: permite se QUALQUER subMenu do módulo tiver a ação marcada.
    return perms.some(p => p.module === module && !!p[action]);
  }
}
