// src/app/features/approval-tiers/approval-tiers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApprovalTier, ApprovalTierPayload } from './approval-tiers.model';

export interface UserItem { id: number; name: string; email?: string; }

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  skip:  number;
  take:  number;
}

export interface ApprovalTierListParams {
  userId?: number;
  skip?:   number;
  take?:   number;
}

@Injectable({ providedIn: 'root' })
export class ApprovalTiersService {
  private http      = inject(HttpClient);
  private base      = `${environment.apiUrl}/v1/approval-limits`;
  private usersBase = `${environment.apiUrl}/v1/users`;

  getAll(params?: ApprovalTierListParams): Observable<PaginatedResponse<ApprovalTier> | ApprovalTier[]> {
    const queryParams: Record<string, string> = {};
    if (params?.userId != null) queryParams['userId'] = String(params.userId);
    if (params?.skip   != null) queryParams['skip']   = String(params.skip);
    if (params?.take   != null) queryParams['take']   = String(params.take);
    return this.http.get<PaginatedResponse<ApprovalTier> | ApprovalTier[]>(this.base, { params: queryParams });
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
}