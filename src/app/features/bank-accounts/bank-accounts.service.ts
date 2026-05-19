// src/app/features/bank-accounts/bank-accounts.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BankAccount, BankAccountPayload, BankAccountsListResponse } from './bank-accounts.model';
import { Entity } from './new/bank-account-new.page';

@Injectable({ providedIn: 'root' })
export class BankAccountsService {
  private http = inject(HttpClient);
  private base     = `${environment.apiUrl}/v1/institutional/bank-accounts`;
  private entitiesBase = `${environment.apiUrl}/v1/institutional/entities`;

  // ── Contas bancárias ──────────────────────────────────────────────────────

  getAll(): Observable<BankAccountsListResponse | BankAccount[]> {
    return this.http.get<BankAccountsListResponse | BankAccount[]>(this.base);
  }

  create(payload: BankAccountPayload): Observable<BankAccount> {
    return this.http.post<BankAccount>(this.base, payload);
  }

  // ── Entidades (para popular select Fonte Pagadora) ────────────────────────

  getEntities(): Observable<Entity[]> {
    return this.http.get<Entity[]>(this.entitiesBase);
  }
}
