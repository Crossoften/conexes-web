// src/app/features/financial-transfers/financial-transfers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateBankTransferPayload, BankAccountOption } from './financial-transfers.model';

@Injectable({ providedIn: 'root' })
export class FinancialTransfersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/banking/transfers`;

  /** FIN-001: contas bancárias para os selects de Origem/Destino. */
  getBankAccounts(): Observable<BankAccountOption[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/v1/institutional/bank-accounts`)
      .pipe(map(res => {
        const rows: any[] = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
        return rows.map(r => ({
          id:    Number(r.id),
          label: r.nickname
            ? `${r.nickname}${r.bankName ? ' — ' + r.bankName : ''}`
            : (r.bankName ? `${r.bankName} — Ag ${r.agency ?? ''} / ${r.account ?? ''}` : `Conta #${r.id}`),
        }));
      }));
  }

  /** FIN-001: cria a transferência (POST /v1/banking/transfers). */
  createTransfer(payload: CreateBankTransferPayload): Observable<unknown> {
    return this.http.post<unknown>(this.base, payload);
  }
}
