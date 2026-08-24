// src/app/features/chart-of-accounts/chart-of-accounts.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account, AccountPayload } from './chart-of-accounts.model';

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/account-plan`;

  /**
   * FE-PC-2: o back passou a devolver o envelope { data, count, pages }
   * (ResponseFindAllAccountPlanDto). Extraímos `data` e mantemos filtro/paginação
   * client-side (a árvore é pequena) — `take` alto para trazer tudo de uma vez.
   */
  getAll(): Observable<Account[]> {
    return this.http
      .get<{ data?: Account[] } | Account[]>(this.base, { params: { take: '1000' } })
      .pipe(map(res => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  getById(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.base}/${id}`);
  }

  create(payload: AccountPayload): Observable<Account> {
    return this.http.post<Account>(this.base, payload);
  }

  update(id: number, payload: Partial<AccountPayload>): Observable<Account> {
    return this.http.patch<Account>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  // PC-02: árvore completa (N níveis) com numeração hierárquica.
  tree(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/tree`);
  }

  // PC-03: importação por planilha.
  importSpreadsheet(file: File): Observable<{ message: string; criadas: number; total: number; results: { line: number; code: string; status: string }[] }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.base}/import`, form);
  }
  downloadImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/import/template`, { responseType: 'blob' });
  }

  /**
   * FE-PC-3: marca/desmarca contas em lote para orçamento (B-PC-03).
   * mode: 'all' (todas) · 'with_transactions' (só com transação) · 'none' (desmarca todas).
   */
  setBudgetFlag(mode: 'all' | 'with_transactions' | 'none'): Observable<unknown> {
    return this.http.patch(`${this.base}/budget-flag`, { mode });
  }
}