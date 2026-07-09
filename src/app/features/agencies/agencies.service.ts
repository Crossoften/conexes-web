// src/app/features/agencies/agencies.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../shared/models/list-page.model';
import { RawListEnvelope, toPage } from '../../shared/utils/to-page';
import { Agency, AgencyPayload, AgencyUpdatePayload } from './agencies.model';

export interface AgencyListParams {
  legalName?: string;
  status?:    string;
  skip?:      number;
  take?:      number;
}

@Injectable({ providedIn: 'root' })
export class AgenciesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/grantors`;

  getAll(params: AgencyListParams = {}): Observable<Page<Agency>> {
    let httpParams = new HttpParams();
    if (params.legalName) httpParams = httpParams.set('legalName', params.legalName);
    if (params.status)    httpParams = httpParams.set('status', params.status);
    if (params.skip != null) httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null) httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<Agency> | Agency[]>(this.base, { params: httpParams })
      .pipe(map(toPage));
  }

  getById(id: number): Observable<Agency> {
    return this.http.get<Agency>(`${this.base}/${id}`);
  }

  create(payload: AgencyPayload): Observable<Agency> {
    return this.http.post<Agency>(this.base, payload);
  }

  update(id: number, payload: AgencyUpdatePayload): Observable<Agency> {
    return this.http.patch<Agency>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }
}
