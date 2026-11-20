// src/app/features/budgets/budgets.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Budget, BudgetTracking } from './budgets.model';

interface ListEnvelope<T> { data: T[]; count: number; pages: number; }

interface ApiBudget {
  id: number;
  title?: string | null;
  description?: string | null;
  exercise?: number | null;
  periodicity?: string | null;
  status?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  launchType?: string | null;
  _count?: { items?: number } | null;
  /** F2/F3: acompanhamento calculado no servidor. */
  tracking?: BudgetTracking | null;
}

export interface BudgetFile { id: number; fileUrl: string; fileKey?: string | null; description?: string | null; createdAt?: string; }
export interface BudgetImportResult { total: number; success: number; failed: number; results: { titulo: string; status: 'success' | 'error'; message: string; budgetId?: number }[]; }

export interface BudgetListResult { items: Budget[]; total: number; pages: number; }

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/budgets`;

  /**
   * `page` é o NÚMERO DA PÁGINA (1-based): o back usa `skip` como página, não
   * offset. A tela mandava `(page-1)*pageSize`, o mesmo defeito já corrigido em
   * Contas a pagar e a receber.
   */
  /** Card #768 (item 62): a busca e o período vão ao servidor. */
  getAll(search = '', take = 10, page = 1, startDate = '', endDate = ''): Observable<BudgetListResult> {
    let params = new HttpParams().set('take', take).set('skip', Math.max(1, page));
    if (search.trim()) params = params.set('search', search.trim());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<ListEnvelope<ApiBudget>>(this.base, { params }).pipe(
      map(res => ({
        items: (res?.data ?? []).map(this.toModel),
        total: res?.count ?? 0,
        pages: res?.pages ?? 0,
      })),
    );
  }

  // ── Card #768 (itens 61 e 62): duplicar, anexos e importação ──────────────
  copy(id: number): Observable<ApiBudget> {
    return this.http.post<ApiBudget>(`${this.base}/${id}/copy`, {});
  }

  listFiles(id: number): Observable<BudgetFile[]> {
    return this.http.get<BudgetFile[]>(`${this.base}/${id}/files`);
  }

  attachFile(id: number, payload: { fileUrl: string; fileKey?: string; description?: string }): Observable<BudgetFile> {
    return this.http.post<BudgetFile>(`${this.base}/${id}/files`, payload);
  }

  removeFile(id: number, fileId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/files/${fileId}`);
  }

  importTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }

  importar(file: File): Observable<BudgetImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<BudgetImportResult>(`${this.base}/import`, form);
  }

  getById(id: number): Observable<ApiBudget> {
    return this.http.get<ApiBudget>(`${this.base}/${id}`);
  }

  create(payload: unknown): Observable<ApiBudget> {
    return this.http.post<ApiBudget>(this.base, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  update(id: number, payload: unknown): Observable<ApiBudget> {
    return this.http.patch<ApiBudget>(`${this.base}/${id}`, payload);
  }

  private toModel = (r: ApiBudget): Budget => {
    const t = r.tracking ?? null;
    const dia = (v?: string | null) =>
      v ? new Date(v).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
    const periodo = [dia(r.periodStart), dia(r.periodEnd)].filter(Boolean).join(' a ');
    return {
      id: String(r.id),
      displayId: `#${r.id}`,
      title: r.title ?? '—',
      description: r.description ?? '—',
      fiscalYear: r.exercise != null ? String(r.exercise) : '—',
      periodicity: r.periodicity ?? '—',
      status: r.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
      rubricas: r._count?.items ?? t?.linhas?.length ?? 0,
      tracking: t,
      // F2: a coluna "Acompanhamento" mostrava "N rubrica(s)" — contava linhas,
      // não acompanhava nada.
      previstoFmt:  brl.format(t?.previsto ?? 0),
      realizadoFmt: brl.format(t?.realizado ?? 0),
      saldoFmt:     brl.format(t?.saldo ?? 0),
      percentual:   t?.percentual ?? 0,
      estourou:     !!t?.estourou,
      // Sem período declarado o realizado soma a base inteira — a tela precisa
      // dizer isso em vez de apresentar o número como se fosse do exercício.
      periodoFmt:   periodo || (t?.periodo?.semRecorte ? 'sem período definido' : '—'),
      periodStart:  r.periodStart ? String(r.periodStart).slice(0, 10) : null,
      periodEnd:    r.periodEnd ? String(r.periodEnd).slice(0, 10) : null,
      launchType:   r.launchType ?? '—',
    };
  };
}
