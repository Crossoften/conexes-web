// src/app/features/users/users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User, UserPayload, UserUpdatePayload, UserFilters,
  PermissionProfile, PermissionProfilePayload, PermissionProfileUpdatePayload, PermissionProfileFilters,
  PaginatedResponse,
} from './users.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http         = inject(HttpClient);
  private baseUsers    = `${environment.apiUrl}/v1/users`;
  private baseProfiles = `${environment.apiUrl}/v1/permission-profiles`;

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