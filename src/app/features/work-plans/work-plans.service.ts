// src/app/features/work-plans/work-plans.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../shared/models/list-page.model';
import { RawListEnvelope, toPage } from '../../shared/utils/to-page';
import {
  WorkPlanListItem,
  WorkPlanDashboard,
  WorkPlanMetric,
  WorkPlanSummaryItem,
  WorkPlanRef,
  CreateWorkPlanPayload,
} from './work-plans.model';

export interface WorkPlanListParams {
  title?:  string;
  status?: string;
  skip?:   number;
  take?:   number;
}

type RawDashboard = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class WorkPlansService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/work-plans`;

  getAll(params: WorkPlanListParams = {}): Observable<Page<WorkPlanListItem>> {
    let httpParams = new HttpParams();
    if (params.title)     httpParams = httpParams.set('title', params.title);
    if (params.status)    httpParams = httpParams.set('status', params.status);
    if (params.skip != null) httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null) httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<WorkPlanListItem> | WorkPlanListItem[]>(this.base, { params: httpParams })
      .pipe(map(toPage));
  }

  getById(id: number): Observable<unknown> {
    return this.http.get(`${this.base}/${id}`);
  }

  create(payload: CreateWorkPlanPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, payload);
  }

  /** Órgãos concessionários → grantorId (select do bloco cabeçalho). */
  getGrantorsLookup(): Observable<WorkPlanRef[]> {
    const params = new HttpParams().set('take', '500');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}/v1/grantors`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows.map(r => ({
          id:        Number(r['id']),
          legalName: (r['legalName'] as string) ?? undefined,
          tradeName: (r['tradeName'] as string) ?? undefined,
        }));
      }));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  getDashboard(): Observable<WorkPlanDashboard> {
    return this.http.get<RawDashboard>(`${this.base}/dashboard`).pipe(map(raw => this.toDashboard(raw)));
  }

  /**
   * Mapeia a resposta do dashboard (formato ainda não tipado no Swagger) para o
   * modelo da UI. Tolerante a diferentes nomes de chave; ajustar quando o JSON
   * real for confirmado.
   */
  private toDashboard(raw: RawDashboard): WorkPlanDashboard {
    const stats = (raw['stats'] as Record<string, unknown> | undefined) ?? {};
    const num = (key: string): string => {
      const v = stats[key];
      if (typeof v === 'number') return String(v);
      if (typeof v === 'string' && v.trim() !== '') return v;
      return '0';
    };

    const metrics: WorkPlanMetric[] = [
      { id: '1', label: 'Produtos em elaboração', value: num('inDevelopment'),    icon: 'cube',  color: 'purple' },
      { id: '2', label: 'Aguardando aprovação',   value: num('awaitingApproval'), icon: 'clock', color: 'blue'   },
      { id: '3', label: 'Planos ativos',          value: num('active'),           icon: 'check', color: 'green'  },
      { id: '4', label: 'Totais de propostas',    value: num('totalProposals'),   icon: 'trend', color: 'purple' },
    ];

    return {
      metrics,
      recentProposals: this.toSummary(raw['recentProposals']),
      recentPlans:     this.toSummary(raw['activePlans'] ?? raw['recentPlans']),
    };
  }

  private toSummary(value: unknown): WorkPlanSummaryItem[] {
    if (!Array.isArray(value)) return [];
    return value.map((r, i) => {
      const row = r as Record<string, unknown>;
      return {
        id:     typeof row['id'] === 'number' ? (row['id'] as number) : i,
        title:  String(row['title'] ?? '—'),
        status: (row['status'] as WorkPlanSummaryItem['status']) ?? 'Draft',
      };
    });
  }
}
