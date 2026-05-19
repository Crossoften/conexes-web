// src/app/features/chart-of-accounts/chart-of-accounts.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account, AccountPayload } from './chart-of-accounts.model';

@Injectable({ providedIn: 'root' })
export class ChartOfAccountsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/account-plan`;

  getAll(): Observable<Account[]> {
    return this.http.get<Account[]>(this.base);
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
}
