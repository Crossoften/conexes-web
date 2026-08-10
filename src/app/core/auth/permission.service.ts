// src/app/core/auth/permission.service.ts
//
// Serviço de autorização do front (UX + defesa em profundidade).
//
// IMPORTANTE: isto NÃO é a fronteira de segurança — o back precisa recusar (403)
// chamadas não autorizadas (ver BK-26). Aqui só escondemos/bloqueamos o que o
// usuário não pode, para melhorar a experiência.
//
// MODO PERMISSIVO: enquanto o /my-self não devolver as permissões efetivas
// (BK-27), `enforced()` é false e TUDO é liberado — o comportamento fica idêntico
// ao de hoje. Quando o back passar a enviar as permissões, o gating liga sozinho.

import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ModulePermission, PermissionAction, PERMISSION_MODULES, MODULE_HOME, normalizeModule } from './permission.model';

/** Conjunto normalizado das 6 chaves de módulo reconhecidas pelo front. */
const KNOWN_MODULES = new Set(Object.values(PERMISSION_MODULES).map(normalizeModule));

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private auth = inject(AuthService);

  /** Permissões efetivas do usuário logado (vazio = o back ainda não envia). */
  private readonly perms = computed<ModulePermission[]>(() => this.auth.user()?.permissions ?? []);

  /**
   * Permissões que casam com os módulos conhecidos do front. Se o back mandar
   * um `permissions` de outro formato/nomes, isto fica vazio → modo permissivo
   * (evita travar o sistema por incompatibilidade de contrato).
   */
  private readonly recognized = computed<ModulePermission[]>(() =>
    this.perms().filter(p => KNOWN_MODULES.has(normalizeModule(p.module)))
  );

  /** Só aplica travas quando há permissões RECONHECIDAS vindas do back. Senão, permissivo. */
  readonly enforced = computed<boolean>(() => this.recognized().length > 0);

  private find(module: string): ModulePermission | undefined {
    const key = normalizeModule(module);
    return this.perms().find(p => normalizeModule(p.module) === key);
  }

  /** Regra base: sem enforcement → true; com enforcement → consulta o flag (ou isUnlimited). */
  can(module: string, action: PermissionAction): boolean {
    if (!this.enforced()) return true;
    const p = this.find(module);
    if (!p) return false;
    return !!p[action] || !!p.isUnlimited;
  }

  canView(module: string):   boolean { return this.can(module, 'canView'); }
  canCreate(module: string): boolean { return this.can(module, 'canCreate'); }
  canEdit(module: string):   boolean { return this.can(module, 'canEdit'); }
  canDelete(module: string): boolean { return this.can(module, 'canDelete'); }

  /** Primeira rota que o usuário pode visualizar; '' quando nenhuma (guard faz fail-open). */
  firstAllowedPath(): string {
    for (const [module, route] of Object.entries(MODULE_HOME)) {
      if (this.canView(module)) return route;
    }
    return '';
  }
}
