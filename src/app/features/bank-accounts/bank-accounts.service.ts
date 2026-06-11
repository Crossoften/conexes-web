// src/app/features/bank-accounts/bank-accounts.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BankAccount, BankAccountPayload, BankAccountsListResponse, Bank, BankPayload } from './bank-accounts.model';
import { Entity } from './new/bank-account-new.page';

@Injectable({ providedIn: 'root' })
export class BankAccountsService {
  private http         = inject(HttpClient);
  private base         = `${environment.apiUrl}/v1/institutional/bank-accounts`;
  private banksBase    = `${environment.apiUrl}/v1/institutional/banks`;
  private entitiesBase = `${environment.apiUrl}/v1/institutional/entities`;

  // ── Contas bancárias ──────────────────────────────────────────────────────

  getAll(): Observable<BankAccountsListResponse | BankAccount[]> {
    return this.http.get<BankAccountsListResponse | BankAccount[]>(this.base);
  }

  getById(id: number): Observable<BankAccount> {
    return this.http.get<BankAccount>(`${this.base}/${id}`);
  }

  create(payload: BankAccountPayload): Observable<BankAccount> {
    return this.http.post<BankAccount>(this.base, payload);
  }

  update(id: number, payload: BankAccountPayload): Observable<BankAccount> {
    return this.http.patch<BankAccount>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Bancos ────────────────────────────────────────────────────────────────

  getAllBanks(): Observable<Bank[]> {
    return this.http.get<Bank[]>(this.banksBase);
  }

  getBankById(id: number): Observable<Bank> {
    return this.http.get<Bank>(`${this.banksBase}/${id}`);
  }

  createBank(payload: BankPayload): Observable<Bank> {
    return this.http.post<Bank>(this.banksBase, payload);
  }

  updateBank(id: number, payload: BankPayload): Observable<Bank> {
    return this.http.patch<Bank>(`${this.banksBase}/${id}`, payload);
  }

  deleteBank(id: number): Observable<void> {
    return this.http.delete<void>(`${this.banksBase}/${id}`);
  }

  // ── Entidades (para popular select Fonte Pagadora) ────────────────────────

  getEntities(): Observable<Entity[]> {
    return this.http.get<Entity[]>(this.entitiesBase);
  }
}
