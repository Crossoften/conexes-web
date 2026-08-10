// src/app/core/auth/permission.guard.ts
//
// Bloqueia o acesso a um módulo quando o usuário não tem `canView` — mas só
// quando o back envia as permissões (modo permissivo por padrão; ver PermissionService).
// Cada rota-filha declara o módulo em `data: { module: '...' }`.

import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { PermissionService } from './permission.service';

export const permissionGuard: CanActivateChildFn = (childRoute) => {
  const perm   = inject(PermissionService);
  const router = inject(Router);

  const module = childRoute.data?.['module'] as string | undefined;

  // Sem enforcement (back não envia permissões) ou rota sem módulo → libera.
  if (!perm.enforced() || !module) return true;
  if (perm.canView(module)) return true;

  // Sem acesso ao módulo → manda para a primeira rota permitida.
  // Fail-open: se não há destino seguro, LIBERA (nunca entra em loop de redirect).
  const target = perm.firstAllowedPath();
  return target ? router.parseUrl(target) : true;
};
