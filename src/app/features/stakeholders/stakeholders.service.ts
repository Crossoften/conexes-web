// src/app/features/stakeholders/stakeholders.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Stakeholder,
  StakeholderFilters,
  StakeholderListResponse,
  StakeholderPayload,
  CnpjData,
} from './stakeholders.model';

@Injectable({ providedIn: 'root' })
export class StakeholdersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/stakeholders`;

  // ── Listagem ──────────────────────────────────────────────────────────────

  getAll(filters: StakeholderFilters = {}): Observable<StakeholderListResponse> {
    let params = new HttpParams();

    if (filters.name)          params = params.set('name',       filters.name);
    if (filters.document)      params = params.set('document',   filters.document);
    if (filters.personType)    params = params.set('personType', filters.personType);
    if (filters.status)        params = params.set('status',     filters.status);
    if (filters.take != null)  params = params.set('take',       filters.take);
    if (filters.skip != null)  params = params.set('skip',       filters.skip);

    return this.http.get<StakeholderListResponse>(this.base, { params });
  }

  // ── Detalhe ───────────────────────────────────────────────────────────────

  getById(id: number): Observable<Stakeholder> {
    return this.http.get<Stakeholder>(`${this.base}/${id}`);
  }

  // ── Criação ───────────────────────────────────────────────────────────────

  create(payload: StakeholderPayload): Observable<Stakeholder> {
    return this.http.post<Stakeholder>(this.base, payload);
  }

  // ── Edição ────────────────────────────────────────────────────────────────

  update(id: number, payload: Partial<StakeholderPayload>): Observable<Stakeholder> {
    return this.http.patch<Stakeholder>(`${this.base}/${id}`, payload);
  }

  // ── Exclusão ──────────────────────────────────────────────────────────────

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Exportar Excel ────────────────────────────────────────────────────────
  // Retorna Blob para que o componente possa fazer download do arquivo.

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, {
      responseType: 'blob',
    });
  }

  // ── Consulta CNPJ na Receita Federal ──────────────────────────────────────
  // Usado no cadastro de PJ para pré-preencher os campos automaticamente.

  getCnpjData(cnpj: string): Observable<CnpjData> {
    const clean = cnpj.replace(/\D/g, '');
    return this.http.get<CnpjData>(`${this.base}/cnpj/${clean}`);
  }
}
