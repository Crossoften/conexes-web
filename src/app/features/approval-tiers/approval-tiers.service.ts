// src/app/features/approval-tiers/approval-tiers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApprovalTier, ApprovalTierPayload, ApprovalScopeOption } from './approval-tiers.model';

export interface UserItem { id: number; name: string; email?: string; }

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  skip:  number;
  take:  number;
}

/** AL-7: envelope oficial do findAll — { data, count, pages }. */
export interface ApprovalTierListEnvelope {
  data:  ApprovalTier[];
  count: number;
  pages: number;
}

export interface ApprovalTierListParams {
  userId?:       number;
  skip?:         number;
  take?:         number;
  type?:         string;
  costCenterId?: number;
  projectId?:    number;
  activityId?:   number;
  search?:       string;
  sort?:         string;
  order?:        'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ApprovalTiersService {
  private http      = inject(HttpClient);
  private base      = `${environment.apiUrl}/v1/approval-limits`;
  private usersBase = `${environment.apiUrl}/v1/users`;

  getAll(params?: ApprovalTierListParams): Observable<ApprovalTierListEnvelope | ApprovalTier[]> {
    const queryParams: Record<string, string> = {};
    if (params?.userId       != null) queryParams['userId']       = String(params.userId);
    if (params?.skip         != null) queryParams['skip']         = String(params.skip);
    if (params?.take         != null) queryParams['take']         = String(params.take);
    if (params?.type)                 queryParams['type']         = params.type;
    if (params?.costCenterId != null) queryParams['costCenterId'] = String(params.costCenterId);
    if (params?.projectId    != null) queryParams['projectId']    = String(params.projectId);
    if (params?.activityId   != null) queryParams['activityId']   = String(params.activityId);
    if (params?.search)               queryParams['search']       = params.search;
    if (params?.sort)                 queryParams['sort']         = params.sort;
    if (params?.order)                queryParams['order']        = params.order;
    return this.http.get<ApprovalTierListEnvelope | ApprovalTier[]>(this.base, { params: queryParams });
  }

  getById(id: number): Observable<ApprovalTier> {
    return this.http.get<ApprovalTier>(`${this.base}/${id}`);
  }

  create(payload: ApprovalTierPayload): Observable<ApprovalTier> {
    return this.http.post<ApprovalTier>(this.base, payload);
  }

  update(id: number, payload: ApprovalTierPayload): Observable<ApprovalTier> {
    return this.http.patch<ApprovalTier>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── AL-6: copiar / transferir alçada ────────────────────────────────────────
  /** Duplica a alçada (POST .../{id}/copy). */
  copy(id: number): Observable<ApprovalTier> {
    return this.http.post<ApprovalTier>(`${this.base}/${id}/copy`, {});
  }

  /** Transfere a alçada para outro aprovador (PATCH .../{id}/transfer). */
  transfer(id: number, userId: number): Observable<ApprovalTier> {
    return this.http.patch<ApprovalTier>(`${this.base}/${id}/transfer`, { userId });
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  getUsers(params?: { name?: string; skip?: number; take?: number }): Observable<PaginatedResponse<UserItem> | UserItem[]> {
    const queryParams: Record<string, string> = {};
    if (params?.name != null) queryParams['name'] = params.name;
    if (params?.skip != null) queryParams['skip'] = String(params.skip);
    if (params?.take != null) queryParams['take'] = String(params.take);
    return this.http.get<PaginatedResponse<UserItem> | UserItem[]>(this.usersBase, { params: queryParams });
  }

  // ── AL-4: lookups de escopo (centro de custo / projeto / atividade) ─────────
  private projectsBase = `${environment.apiUrl}/v1/projects`;

  getCostCenters(): Observable<ApprovalScopeOption[]> {
    return this.scopeLookup({ type: 'centro_de_custo', take: '500' });
  }

  getProjects(): Observable<ApprovalScopeOption[]> {
    return this.scopeLookup({ take: '500' });
  }

  getActivities(): Observable<ApprovalScopeOption[]> {
    return this.scopeLookup({ kind: 'atividade', take: '500' });
  }

  private scopeLookup(params: Record<string, string>): Observable<ApprovalScopeOption[]> {
    return this.http
      .get<unknown>(this.projectsBase, { params })
      .pipe(map(res => {
        const rows: unknown[] = Array.isArray(res)
          ? res
          : ((res as { data?: unknown[] })?.data ?? []);
        return rows
          .map(r => {
            const o = r as Record<string, unknown>;
            return { id: Number(o['id']), name: String(o['name'] ?? o['title'] ?? o['id']) };
          })
          .filter(o => !isNaN(o.id));
      }));
  }
}