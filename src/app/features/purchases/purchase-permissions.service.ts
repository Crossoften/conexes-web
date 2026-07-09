// src/app/features/purchases/purchase-permissions.service.ts
//
// Camada única de decisão de permissão do módulo de Compras.
// Combina a role global do usuário (cadastro de usuários / /my-self) com os
// papéis de alçada de compras (purchaseRoles, derivados de /v1/approval-limits).
// Todo gate de tela do módulo deve consultar este serviço — nunca checar role solta.

import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PurchaseRole } from './purchases.model';

/** Roles globais que atuam como Gestor de compras mesmo sem alçada `Manager`. */
const GLOBAL_MANAGER_ROLES = ['Master', 'Admin', 'ProcurementManager'];

/**
 * Fallback de aprovação por role global — usado quando o /my-self ainda não
 * retorna `purchaseRoles`. Backoffice cobre os Supervisores de Requisição/Compras;
 * Operational (requisitante/comprador) fica de fora, preservando o gate esperado.
 */
const GLOBAL_APPROVER_ROLES = [...GLOBAL_MANAGER_ROLES, 'Backoffice'];

@Injectable({ providedIn: 'root' })
export class PurchasePermissionsService {
  private auth = inject(AuthService);

  /** Papéis de alçada de compras do usuário logado. */
  readonly purchaseRoles = computed<PurchaseRole[]>(
    () => (this.auth.user()?.purchaseRoles ?? []) as PurchaseRole[],
  );

  /** Role global (cadastro de usuários). */
  readonly globalRole = computed(() => this.auth.user()?.role ?? '');

  hasPurchaseRole(role: PurchaseRole): boolean {
    return this.purchaseRoles().includes(role);
  }

  /** Gestor: alçada `Manager` ou fallback por role global. */
  readonly isManager = computed(
    () => this.purchaseRoles().includes('Manager') || GLOBAL_MANAGER_ROLES.includes(this.globalRole()),
  );

  readonly isRequestSupervisor  = computed(() => this.purchaseRoles().includes('RequestSupervisor'));
  readonly isPurchaseSupervisor = computed(() => this.purchaseRoles().includes('PurchaseSupervisor'));
  readonly isBuyer              = computed(() => this.purchaseRoles().includes('Buyer'));
  readonly isRequester          = computed(() => this.purchaseRoles().includes('Requester'));

  /** True quando não há informação de papéis de compras (usa-se o fallback global). */
  readonly hasNoPurchaseRoleInfo = computed(() => this.purchaseRoles().length === 0);

  /** Fallback: pode aprovar por role global quando os purchaseRoles estão ausentes. */
  readonly canApproveByGlobalRole = computed(() => GLOBAL_APPROVER_ROLES.includes(this.globalRole()));
}
