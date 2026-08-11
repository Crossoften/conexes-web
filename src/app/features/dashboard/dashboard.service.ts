// src/app/features/dashboard/dashboard.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DashboardSummary {
  stakeholders:      number;
  partnerships:      number;
  payablesOpen:      number;
  payablesOpenValue: number;
  accountabilities:  number;
}

export interface DashboardAccountability {
  id:     number;
  title:  string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/v1`;

  /** Cada contador é isolado: uma falha vira 0 e não derruba o painel. */
  summary(): Observable<DashboardSummary> {
    return forkJoin({
      stakeholders:      this.count(`${this.api}/stakeholders?take=1`),
      partnerships:      this.count(`${this.api}/partnerships?take=1`),
      payablesOpen:      this.count(`${this.api}/accounts-payable?status=Open&take=1`),
      payablesOpenValue: this.sumAmount(`${this.api}/accounts-payable?status=Open&take=100000`),
      accountabilities:  this.count(`${this.api}/accountability`),
    });
  }

  /** Soma o valor das contas em aberto no front (não há endpoint de agregação no back). */
  private sumAmount(url: string): Observable<number> {
    return this.http.get<any>(url).pipe(
      map(res => {
        const rows: any[] = Array.isArray(res) ? res : res?.data ?? [];
        return rows.reduce((acc, r) => acc + (Number(r?.netAmount ?? r?.amount ?? r?.grossAmount) || 0), 0);
      }),
      catchError(() => of(0)),
    );
  }

  recentAccountabilities(): Observable<DashboardAccountability[]> {
    return this.http.get<any>(`${this.api}/accountability`).pipe(
      map(res => (Array.isArray(res) ? res : res?.data ?? [])
        .slice(0, 5)
        .map((r: any) => ({ id: r.id, title: r.title ?? '—', status: r.status ?? '—' }))),
      catchError(() => of([])),
    );
  }

  private count(url: string): Observable<number> {
    return this.http.get<any>(url).pipe(
      map(res => {
        if (Array.isArray(res)) return res.length;
        if (typeof res?.count === 'number') return res.count;
        if (Array.isArray(res?.data)) return res.data.length;
        return 0;
      }),
      catchError(() => of(0)),
    );
  }
}
