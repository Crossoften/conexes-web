// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Contratos com o back-end ──────────────────────────────────────────────────

interface LoginRequest {
  email:    string;
  password: string;
}

interface LoginResponse {
  token: string;
  id:    number;
  role:  string;
}

interface MySelfResponse {
  id:            number;
  name:          string;
  email:         string;
  phone:         string;
  code:          string;
  role:          string;
  status:        string;
  createdAt:     string;
  updatedAt:     string;
  /** Papéis de alçada de compras derivados de /approval-limits (Swagger). */
  purchaseRoles?: string[];
  /** PERM-fix: permissões efetivas (perfil + diretas) mescladas pelo back em /my-self. */
  effectivePermissions?: EffectivePermission[];
}

// ── Model interno do front ────────────────────────────────────────────────────

/**
 * PERM-fix: permissão efetiva de um par module/subMenu, conforme o back mescla
 * em /my-self (mergeEffectivePermissions). subMenu é nulo em permissões de módulo.
 */
export interface EffectivePermission {
  module:      string;
  subMenu:     string | null;
  canView:     boolean;
  canCreate:   boolean;
  canEdit:     boolean;
  canDelete:   boolean;
  isUnlimited: boolean;
}

export interface AuthUser {
  id:            string;
  name:          string;
  email:         string;
  phone:         string;
  code:          string;
  role:          string;
  status:        string;
  avatar:        string | null;
  /** Papéis de alçada de compras (vazio quando o usuário não tem alçadas). */
  purchaseRoles: string[];
  /** PERM-fix: permissões efetivas do usuário (vazio quando ainda não carregou). */
  effectivePermissions: EffectivePermission[];
}

// ── Chaves do localStorage ────────────────────────────────────────────────────

const STORAGE_USER  = 'auth_user';
const STORAGE_TOKEN = 'auth_token';

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<AuthUser | null>(this.loadUserFromStorage());

  readonly user         = this._user.asReadonly();
  readonly isLoggedIn   = computed(() => this._user() !== null);
  readonly userInitials = computed(() => {
    const name = this._user()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<void> {
    // 1. Autentica e obtém o token
    const loginRes = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/v1/login`, {
        email,
        password,
      } as LoginRequest)
    );

    // 2. Persiste o token antes de chamar /my-self (o interceptor vai usá-lo)
    localStorage.setItem(STORAGE_TOKEN, loginRes.token);

    // 3. Busca os dados completos do usuário
    const me = await firstValueFrom(
      this.http.get<MySelfResponse>(`${environment.apiUrl}/v1/my-self`)
    );

    // 4. Monta o model interno e persiste
    const user: AuthUser = {
      id:            String(me.id),
      name:          me.name,
      email:         me.email,
      phone:         me.phone,
      code:          me.code,
      role:          me.role,
      status:        me.status,
      avatar:        null,
      purchaseRoles: me.purchaseRoles ?? [],
      effectivePermissions: me.effectivePermissions ?? [],
    };

    this._user.set(user);
    localStorage.setItem(STORAGE_USER, JSON.stringify(user));
  }

  // ── Refresh do perfil (recarrega /my-self para sessões já abertas) ──────────

  /**
   * Reobtém /my-self e atualiza o usuário armazenado — usado no bootstrap para que
   * sessões abertas antes de novos campos (ex.: purchaseRoles) os recebam sem relogar.
   * Silencioso: em caso de erro, mantém o usuário do storage.
   */
  async refreshProfile(): Promise<void> {
    if (!this.isAuthenticated()) return;
    try {
      const me = await firstValueFrom(
        this.http.get<MySelfResponse>(`${environment.apiUrl}/v1/my-self`)
      );
      const current = this._user();
      const user: AuthUser = {
        id:            String(me.id),
        name:          me.name,
        email:         me.email,
        phone:         me.phone,
        code:          me.code,
        role:          me.role,
        status:        me.status,
        avatar:        current?.avatar ?? null,
        purchaseRoles: me.purchaseRoles ?? [],
        effectivePermissions: me.effectivePermissions ?? [],
      };
      this._user.set(user);
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    } catch {
      // mantém o usuário atual do storage
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    this.router.navigate(['/auth/login']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isAuthenticated(): boolean {
    return this._user() !== null;
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_TOKEN);
  }

  // ── Inicialização ─────────────────────────────────────────────────────────

  private loadUserFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthUser;
      // PERM-fix: sessões salvas antes deste campo não têm effectivePermissions —
      // normaliza para [] (nega por padrão até o refreshProfile do bootstrap).
      return { ...parsed, effectivePermissions: parsed.effectivePermissions ?? [] };
    } catch {
      return null;
    }
  }
}
