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
    const num = (...keys: string[]): string => {
      for (const k of keys) {
        const v = raw[k];
        if (typeof v === 'number') return String(v);
        if (typeof v === 'string' && v.trim() !== '') return v;
      }
      return '0';
    };

    const metrics: WorkPlanMetric[] = [
      { id: '1', label: 'Produtos em elaboração', value: num('inElaboration', 'draft', 'elaboration', 'drafts'), icon: 'cube',  color: 'purple' },
      { id: '2', label: 'Aguardando aprovação',   value: num('awaitingApproval', 'awaiting', 'pending'),          icon: 'clock', color: 'blue'   },
      { id: '3', label: 'Planos ativos',          value: num('activePlans', 'active', 'activeCount'),             icon: 'check', color: 'green'  },
      { id: '4', label: 'Totais de propostas',    value: num('totalProposals', 'proposals', 'total'),            icon: 'trend', color: 'purple' },
    ];

    return {
      metrics,
      recentProposals: this.toSummary(raw['recentProposals'] ?? raw['proposals']),
      recentPlans:     this.toSummary(raw['recentPlans'] ?? raw['activePlans'] ?? raw['plans']),
    };
  }

  private toSummary(value: unknown): WorkPlanSummaryItem[] {
    if (!Array.isArray(value)) return [];
    return value.map(r => ({
      id:     Number((r as Record<string, unknown>)['id']),
      title:  String((r as Record<string, unknown>)['title'] ?? '—'),
      status: ((r as Record<string, unknown>)['status'] as WorkPlanSummaryItem['status']) ?? 'Draft',
    }));
  }
}
