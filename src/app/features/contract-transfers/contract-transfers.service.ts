// src/app/features/contract-transfers/contract-transfers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../shared/models/list-page.model';
import { RawListEnvelope, toPage } from '../../shared/utils/to-page';
import {
  Partnership,
  PartnershipListItem,
  PartnershipDetail,
  PartnershipPayload,
  PartnershipUpdatePayload,
  PartnershipRef,
} from './contract-transfers.model';

export interface PartnershipListParams {
  title?:  string;
  status?: string;
  skip?:   number;
  take?:   number;
}

@Injectable({ providedIn: 'root' })
export class ContractTransfersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/partnerships`;

  getAll(params: PartnershipListParams = {}): Observable<Page<PartnershipListItem>> {
    let httpParams = new HttpParams();
    if (params.title)     httpParams = httpParams.set('title', params.title);
    if (params.status)    httpParams = httpParams.set('status', params.status);
    if (params.skip != null) httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null) httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<PartnershipListItem> | PartnershipListItem[]>(this.base, { params: httpParams })
      .pipe(map(toPage));
  }

  getById(id: number): Observable<PartnershipDetail> {
    return this.http.get<PartnershipDetail>(`${this.base}/${id}`);
  }

  create(payload: PartnershipPayload): Observable<Partnership> {
    return this.http.post<Partnership>(this.base, payload);
  }

  update(id: number, payload: PartnershipUpdatePayload): Observable<Partnership> {
    return this.http.patch<Partnership>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  // ── Lookups (selects do formulário) ─────────────────────────────────────────

  /** Órgãos concessionários → grantorId. */
  getGrantorsLookup(): Observable<PartnershipRef[]> {
    return this.lookup(`${environment.apiUrl}/v1/grantors`);
  }

  /** Entidades → entityId. */
  getEntitiesLookup(): Observable<PartnershipRef[]> {
    return this.lookup(`${environment.apiUrl}/v1/institutional/entities`);
  }

  private lookup(url: string): Observable<PartnershipRef[]> {
    const params = new HttpParams().set('take', '500');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(url, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows.map(r => ({
          id:        Number(r['id']),
          legalName: (r['legalName'] as string) ?? undefined,
          tradeName: (r['tradeName'] as string) ?? undefined,
          name:      (r['name'] as string) ?? undefined,
        }));
      }));
  }
}
