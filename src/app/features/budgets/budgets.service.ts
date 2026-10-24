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
  _count?: { items?: number } | null;
  /** F2/F3: acompanhamento calculado no servidor. */
  tracking?: BudgetTracking | null;
}

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
  getAll(search = '', take = 10, page = 1): Observable<BudgetListResult> {
    const params = new HttpParams().set('take', take).set('skip', Math.max(1, page));
    // `search` não vai ao servidor: a listagem de orçamentos só aceita take,
    // skip e projectId. A busca é aplicada no store, sobre a página carregada.

    return this.http.get<ListEnvelope<ApiBudget>>(this.base, { params }).pipe(
      map(res => ({
        items: (res?.data ?? []).map(this.toModel),
        total: res?.count ?? 0,
        pages: res?.pages ?? 0,
      })),
    );
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
    };
  };
}
