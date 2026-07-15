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

  getById(id: number, entityType: 'cost_center' | 'project'): Observable<CostCenter> {
    const params = new HttpParams().set('entityType', entityType);
    return this.http.get<CostCenter>(`${this.base}/${id}`, { params });
  }

  create(payload: CostCenterPayload): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.base, payload);
  }

  update(id: number, entityType: 'cost_center' | 'project', payload: Partial<CostCenterPayload>): Observable<CostCenter> {
    const params = new HttpParams().set('entityType', entityType);
    return this.http.patch<CostCenter>(`${this.base}/${id}`, payload, { params });
  }

  delete(id: number, entityType: 'cost_center' | 'project'): Observable<void> {
    const params = new HttpParams().set('entityType', entityType);
    return this.http.delete<void>(`${this.base}/${id}`, { params });
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }
}