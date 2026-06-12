// src/app/features/cost-centers/cost-centers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CostCenter,
  CostCenterPayload,
  CostCenterListParams,
  CostCenterListResponse,
  toEntityType,
} from './cost-centers.model';

@Injectable({ providedIn: 'root' })
export class CostCentersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/projects`;

  getAll(params: CostCenterListParams = {}): Observable<CostCenterListResponse> {
    let p = new HttpParams();
    if (params.name) p = p.set('name', params.name);
    if (params.type) p = p.set('type', params.type);
    if (params.skip != null) p = p.set('skip', String(params.skip));
    if (params.take != null) p = p.set('take', String(params.take));
    return this.http.get<CostCenterListResponse>(this.base, { params: p });
  }

  getById(id: number, type: string): Observable<CostCenter> {
    const params = new HttpParams().set('entityType', toEntityType(type));
    return this.http.get<CostCenter>(`${this.base}/${id}`, { params });
  }

  create(payload: CostCenterPayload): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.base, payload);
  }

  update(id: number, type: string, payload: Partial<CostCenterPayload>): Observable<CostCenter> {
    const params = new HttpParams().set('entityType', toEntityType(type));
    return this.http.patch<CostCenter>(`${this.base}/${id}`, payload, { params });
  }

  delete(id: number, type: string): Observable<void> {
    const params = new HttpParams().set('entityType', toEntityType(type));
    return this.http.delete<void>(`${this.base}/${id}`, { params });
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }
}