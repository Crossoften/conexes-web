// src/app/features/bank-reconciliation/bank-reconciliation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReconAccount {
  id: number; name: string; agency: string; account: string;
  balance: number; conciliated: number; pending: number; pendingCount: number;
}
export interface ReconPending { id: number; date: string; day: number; value: number; }
export interface ReconMovement {
  id: number; bankDescription: string; bankValue: number; date: string; type: string;
  reconciled: boolean; conexosDescription: string | null; conexosValue: number | null;
  stakeholder: string | null; costCenter: string | null;
}
export interface AccountReconciliation {
  account: { id: number; name: string; agency: string; account: string; balance: number };
  pendingReconciliations: ReconPending[];
  movements: ReconMovement[];
}

@Injectable({ providedIn: 'root' })
export class BankReconciliationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/banking/reconciliation`;

  /** Lista as contas bancárias com totais de conciliado/pendente (para escolher a conta). */
  getAccounts(): Observable<ReconAccount[]> {
    return this.http.get<ReconAccount[]>(this.base);
  }

  /** Dados de conciliação de uma conta: pendências + movimentações + saldo. */
  getAccountReconciliation(bankAccountId: number): Observable<AccountReconciliation> {
    return this.http.get<AccountReconciliation>(`${this.base}/${bankAccountId}`);
  }

  /** Concilia uma transação bancária a um lançamento (PATCH match). */
  match(transactionId: number, payload: unknown): Observable<unknown> {
    return this.http.patch(`${this.base}/${transactionId}/match`, payload);
  }
}
