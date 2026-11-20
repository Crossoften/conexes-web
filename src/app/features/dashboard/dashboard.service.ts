// src/app/features/dashboard/dashboard.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardFiltros { startDate: string; endDate: string; costCenterId: string; projectId: string; }

/**
 * Card #768 (item 72): o dashboard da tela de Início, em abas. Cada aba tem o seu
 * endpoint, agregado no servidor sobre os dados reais (antes a tela somava no
 * navegador as contas a pagar em aberto, e o Financeiro não tinha dashboard).
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/v1/dashboard`;

  private params(f?: Partial<DashboardFiltros>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f ?? {})) if (v) p = p.set(k, String(v));
    return p;
  }

  inicio(): Observable<any> { return this.http.get<any>(`${this.api}/inicio`); }
  financeiro(f: Partial<DashboardFiltros>): Observable<any> { return this.http.get<any>(`${this.api}/financeiro`, { params: this.params(f) }); }
  compras(f: Partial<DashboardFiltros>): Observable<any> { return this.http.get<any>(`${this.api}/compras`, { params: this.params(f) }); }
  exportar(aba: 'financeiro' | 'compras', f: Partial<DashboardFiltros>): Observable<Blob> {
    return this.http.get(`${this.api}/export`, { params: this.params({ ...f, aba } as any), responseType: 'blob' });
  }
}
