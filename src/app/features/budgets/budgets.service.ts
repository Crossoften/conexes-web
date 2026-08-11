// src/app/features/budgets/budgets.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Budget } from './budgets.model';

interface ListEnvelope<T> { data: T[]; count: number; pages: number; }

interface ApiBudget {
  id: number;
  title?: string | null;
  description?: string | null;
  exercise?: number | null;
  periodicity?: string | null;
  status?: string | null;
  _count?: { items?: number } | null;
}

export interface BudgetListResult { items: Budget[]; total: number; pages: number; }

@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/budgets`;

  getAll(search = '', take = 10, skip = 0): Observable<BudgetListResult> {
    let params = new HttpParams().set('take', take).set('skip', skip);
    if (search) params = params.set('name', search);

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

  private toModel = (r: ApiBudget): Budget => ({
    id: String(r.id),
    displayId: `#${r.id}`,
    title: r.title ?? '—',
    tracking: `${r._count?.items ?? 0} rubrica(s)`,
    description: r.description ?? '—',
    fiscalYear: r.exercise != null ? String(r.exercise) : '—',
    periodicity: r.periodicity ?? '—',
    status: r.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
  });
}
