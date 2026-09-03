// src/app/core/auth/permission.guard.ts
//
// PERM-fix (Fase B): guarda de rota que respeita o Perfil de Permissão. Lê
// `data: { module, subMenu }` da rota (espelho de layout/sidebar/permission-map.ts)
// e bloqueia o acesso quando o usuário não tem canView. Master passa sempre
// (bypass no PermissionsService). Rotas sem `module` no data não são bloqueadas.
//
// Usado em conjunto com o authGuard (login) já aplicado no shell.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionsService } from './permissions.service';

export const permissionGuard: CanActivateFn = (route) => {
  const perms  = inject(PermissionsService);
  const router = inject(Router);

  const module  = route.data?.['module']  as string | undefined;
  const subMenu = route.data?.['subMenu'] as string | undefined;

  // Sem metadados de permissão → rota livre para o usuário autenticado.
  if (!module) return true;

  if (perms.canView(module, subMenu)) return true;

  // Sem acesso: volta para o Início (Dashboard) preservando a sessão.
  router.navigate(['/dashboard']);
  return false;
};
