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

  // Busca a configuração de impostos de um fornecedor (usada para pré-preencher).
  getByStakeholder(id: number): Observable<Tax> {
    return this.http.get<Tax>(`${this.base}/stakeholder/${id}`);
  }

  // POST é createOrUpdate (upsert por stakeholderId) — serve para criar E editar.
  // O contrato não expõe PATCH/{id} nem GET/{id}.
  save(payload: TaxPayload): Observable<Tax> {
    return this.http.post<Tax>(this.base, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Stakeholders ──────────────────────────────────────────────────────────

  getStakeholders(): Observable<any> {
    return this.http.get<any>(`${this.stakeholdersBase}?take=200`);
  }

  // Detalhe do fornecedor (para trazer os impostos já preenchidos no cadastro dele).
  getStakeholderById(id: number): Observable<any> {
    return this.http.get<any>(`${this.stakeholdersBase}/${id}`);
  }
}
