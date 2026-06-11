// src/app/features/users/users.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User, UserPayload, UserUpdatePayload, UserFilters,
  Permission, PermissionPayload, PermissionUpdatePayload, PermissionFilters,
  PaginatedResponse,
} from './users.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private baseUsers       = `${environment.apiUrl}/v1/users`;
  private basePermissions = `${environment.apiUrl}/v1/permissions`;

  // ── Draft (step 1 → step 2) ───────────────────────────────────────────────

  readonly draftUserData = signal<Partial<UserPayload> | null>(null);

  saveDraft(data: Partial<UserPayload>): void { this.draftUserData.set(data); }
  clearDraft(): void { this.draftUserData.set(null); }

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

  // ── Permissions ───────────────────────────────────────────────────────────

  getPermissions(filters?: PermissionFilters): Observable<PaginatedResponse<Permission>> {
    let params = new HttpParams();
    if (filters?.skip   != null) params = params.set('skip',   filters.skip);
    if (filters?.take   != null) params = params.set('take',   filters.take);
    if (filters?.module)         params = params.set('module', filters.module);
    if (filters?.userId != null) params = params.set('userId', filters.userId);
    return this.http.get<PaginatedResponse<Permission>>(this.basePermissions, { params });
  }

  getPermissionById(id: number): Observable<Permission> {
    return this.http.get<Permission>(`${this.basePermissions}/${id}`);
  }

  createPermission(payload: PermissionPayload): Observable<Permission> {
    return this.http.post<Permission>(this.basePermissions, payload);
  }

  updatePermission(id: number, payload: PermissionUpdatePayload): Observable<Permission> {
    return this.http.patch<Permission>(`${this.basePermissions}/${id}`, payload);
  }

  deletePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePermissions}/${id}`);
  }
}