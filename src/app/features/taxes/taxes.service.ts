// src/app/features/taxes/taxes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tax, TaxPayload, StakeholderItem } from './taxes.model';

@Injectable({ providedIn: 'root' })
export class TaxesService {
  private http = inject(HttpClient);
  private base  = `${environment.apiUrl}/v1/tax-service`;
  private stakeholdersBase = `${environment.apiUrl}/v1/stakeholders`;

  // ── Tax Service ───────────────────────────────────────────────────────────

  getAll(): Observable<Tax[]> {
    return this.http.get<Tax[]>(this.base);
  }

  getById(id: number): Observable<Tax> {
    return this.http.get<Tax>(`${this.base}/${id}`);
  }

  getByStakeholder(id: number): Observable<Tax> {
    return this.http.get<Tax>(`${this.base}/stakeholder/${id}`);
  }

  create(payload: TaxPayload): Observable<Tax> {
    return this.http.post<Tax>(this.base, payload);
  }

  update(id: number, payload: TaxPayload): Observable<Tax> {
    return this.http.patch<Tax>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Stakeholders ──────────────────────────────────────────────────────────

  getStakeholders(): Observable<any> {
    return this.http.get<any>(`${this.stakeholdersBase}?take=200`);
  }
}
