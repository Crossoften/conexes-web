// src/app/features/users/users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';
import {
  User, UserPayload, UserUpdatePayload, UserFilters,
  PermissionProfile, PermissionProfilePayload, PermissionProfileUpdatePayload, PermissionProfileFilters,
  PaginatedResponse, EntityLite, ModulePermission, DEFAULT_MODULES,
} from './users.model';

/** Linha em branco da matriz de permissões. */
function blankPermission(module: string, subMenu = ''): ModulePermission {
  return { module, subMenu, canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false };
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http         = inject(HttpClient);
  private baseUsers    = `${environment.apiUrl}/v1/users`;
  private baseProfiles = `${environment.apiUrl}/v1/permission-profiles`;

  // ── Lookups ─────────────────────────────────────────────────────────────────

  /** Entidades (empresas) para o vínculo do usuário (US-6). */
  getEntities(): Observable<EntityLite[]> {
    return this.http
      .get<EntityLite[] | { data?: EntityLite[] }>(`${environment.apiUrl}/v1/institutional/entities`)
      .pipe(map(res => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  /**
   * US-7: catálogo oficial de módulos/subMenus para montar a matriz de permissões,
   * em vez de uma lista fixa no front. O shape do back é flexível — normalizamos
   * defensivamente e, se vier vazio/erro, caímos no DEFAULT_MODULES.
   */
  getModulesCatalog(): Observable<ModulePermission[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/v1/permissions/modules-catalog`)
      .pipe(map(res => this.normalizeCatalog(res)));
  }

  private normalizeCatalog(res: unknown): ModulePermission[] {
    const r = res as Record<string, unknown>;
    const rows: unknown[] = Array.isArray(res)
      ? res
      : (r?.['data'] as unknown[]) ?? (r?.['modules'] as unknown[]) ?? (r?.['catalog'] as unknown[]) ?? [];

    const out: ModulePermission[] = [];
    for (const it of rows) {
      if (typeof it === 'string') { out.push(blankPermission(it)); continue; }
      const o = it as Record<string, unknown>;
      const module = (o['module'] ?? o['name'] ?? o['label'] ?? o['group'] ?? '') as string;
      if (!module) continue;
      const subs = o['subMenus'] ?? o['subMenu'] ?? o['children'] ?? o['functions'];
      if (Array.isArray(subs) && subs.length) {
        for (const s of subs) {
          const label = typeof s === 'string' ? s : ((s as Record<string, unknown>)?.['subMenu'] ?? (s as Record<string, unknown>)?.['name'] ?? (s as Record<string, unknown>)?.['label'] ?? '') as string;
          out.push(blankPermission(module, label));
        }
      } else {
        out.push(blankPermission(module, typeof subs === 'string' ? subs : ''));
      }
    }
    return out.length ? out : DEFAULT_MODULES.map(m => ({ ...m }));
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  getUsers(filters?: UserFilters): Observable<PaginatedResponse<User>> {
    let params = new HttpParams();
    if (filters?.skip  != null) params = params.set('skip',  filters.skip);
    if (filters?.take  != null) params = params.set('take',  filters.take);
    if (filters?.role)          params = params.set('role',  filters.role);
    if (filters?.name)          params = params.set('name',  filters.name);
    return this.http.get<PaginatedResponse<User>>(this.baseUsers, { params });
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.baseUsers}/${id}`);
  }

  createUser(payload: UserPayload): Observable<User> {
    return this.http.post<User>(this.baseUsers, payload);
  }

  updateUser(id: number, payload: UserUpdatePayload): Observable<User> {
    return this.http.patch<User>(`${this.baseUsers}/${id}`, payload);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUsers}/${id}`);
  }

  // ── Permission Profiles ───────────────────────────────────────────────────

  getProfiles(filters?: PermissionProfileFilters): Observable<PaginatedResponse<PermissionProfile>> {
    let params = new HttpParams();
    if (filters?.skip != null) params = params.set('skip', filters.skip);
    if (filters?.take != null) params = params.set('take', filters.take);
    if (filters?.name)         params = params.set('name', filters.name);
    return this.http.get<PaginatedResponse<PermissionProfile>>(this.baseProfiles, { params });
  }

  getProfileById(id: number): Observable<PermissionProfile> {
    return this.http.get<PermissionProfile>(`${this.baseProfiles}/${id}`);
  }

  createProfile(payload: PermissionProfilePayload): Observable<PermissionProfile> {
    return this.http.post<PermissionProfile>(this.baseProfiles, payload);
  }

  updateProfile(id: number, payload: PermissionProfileUpdatePayload): Observable<PermissionProfile> {
    return this.http.patch<PermissionProfile>(`${this.baseProfiles}/${id}`, payload);
  }

  deleteProfile(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseProfiles}/${id}`);
  }
}