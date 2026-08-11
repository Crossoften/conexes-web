// src/app/features/financial-reports/financial-reports.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ReportFilters {
  startDate?: string;
  endDate?:   string;
  status?:    string;
}

export interface ReportRow {
  id:     number;
  kind:   'AP' | 'AR';
  kindLabel: string;
  party:  string;
  date:   string;
  status: string;
  value:  number;
}

export interface ReportData {
  payables:    ReportRow[];
  receivables: ReportRow[];
}

@Injectable({ providedIn: 'root' })
export class FinancialReportsService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/v1`;

  /** Traz o universo do período (take alto) e consolida no front — não há agregação no back. */
  load(filters: ReportFilters): Observable<ReportData> {
    const ap = this.qs({ take: '100000', status: filters.status, startDate: filters.startDate, endDate: filters.endDate });
    const ar = this.qs({ take: '100000', status: filters.status, startDate: filters.startDate, endDate: filters.endDate });
    return forkJoin({
      payables:    this.rows(`${this.api}/accounts-payable?${ap}`, 'AP'),
      receivables: this.rows(`${this.api}/accounts-receivable?${ar}`, 'AR'),
    });
  }

  exportPayables():    Observable<Blob> { return this.blob(`${this.api}/accounts-payable/export/excel`); }
  exportReceivables(): Observable<Blob> { return this.blob(`${this.api}/accounts-receivable/export/excel`); }

  private rows(url: string, kind: 'AP' | 'AR'): Observable<ReportRow[]> {
    return this.http.get<any>(url).pipe(
      map(res => {
        const data: any[] = Array.isArray(res) ? res : res?.data ?? [];
        return data.map(r => ({
          id: r.id,
          kind,
          kindLabel: kind === 'AP' ? 'A pagar' : 'A receber',
          party: r.stakeholder?.name ?? r.stakeholder?.tradeName ?? '—',
          date: kind === 'AP' ? (r.dueDate ?? r.competencyDate ?? r.issueDate) : (r.issueDate ?? r.dueDate),
          status: r.status ?? '—',
          value: Number(r.netAmount ?? r.amount ?? r.grossAmount) || 0,
        }));
      }),
      catchError(() => of([])),
    );
  }

  private blob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  private qs(params: Record<string, string | undefined>): string {
    return Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join('&');
  }
}
