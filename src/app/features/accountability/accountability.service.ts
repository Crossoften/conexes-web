// src/app/features/accountability/accountability.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountabilityDetail, AccountabilityListItem, PartnershipOption } from './accountability.model';

@Injectable({ providedIn: 'root' })
export class AccountabilityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/accountability`;

  list(): Observable<AccountabilityListItem[]> {
    return this.http.get<AccountabilityListItem[]>(this.base);
  }

  getById(id: number): Observable<AccountabilityDetail> {
    return this.http.get<AccountabilityDetail>(`${this.base}/${id}`);
  }

  create(payload: { partnershipId: number; title: string; periodStart?: string; periodEnd?: string }): Observable<AccountabilityDetail> {
    return this.http.post<AccountabilityDetail>(this.base, payload);
  }

  validateItem(itemId: number, body: { cndOk?: boolean; rubricaOk?: boolean } = {}): Observable<unknown> {
    return this.http.patch(`${this.base}/items/${itemId}/validate`, body);
  }

  returnItem(itemId: number, reason: string): Observable<unknown> {
    return this.http.patch(`${this.base}/items/${itemId}/return`, { reason });
  }

  approve(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/approve`, {});
  }

  reportPdfUrl(id: number): string {
    return `${this.base}/${id}/report/pdf`;
  }

  /** Baixa o PDF do relatório (via HttpClient para carregar o Bearer pelo interceptor). */
  downloadReport(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/report/pdf`, { responseType: 'blob' });
  }

  /** Lookup de parcerias para o "Novo processo". */
  partnerships(): Observable<PartnershipOption[]> {
    return this.http.get<any>(`${environment.apiUrl}/v1/partnerships?take=500`).pipe(
      map(res => {
        const rows: any[] = Array.isArray(res) ? res : res?.data ?? [];
        return rows.map(r => ({ id: Number(r.id), title: String(r.title ?? `Parceria #${r.id}`) }));
      }),
    );
  }
}
