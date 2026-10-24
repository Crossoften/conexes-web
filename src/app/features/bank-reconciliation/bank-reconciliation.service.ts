// src/app/features/bank-reconciliation/bank-reconciliation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReconAccount {
  id: number; name: string; agency: string; account: string;
  balance: number; conciliated: number; pending: number; pendingCount: number;
}
/**
 * CB-03 / I060: a pendência passou a trazer os dados da própria movimentação —
 * antes vinham só id/data/valor e a tela exibia um texto fixo para toda linha.
 */
export interface ReconPending {
  id: number; date: string; day: number; value: number;
  description?: string | null; category?: string | null; type?: string;
  stakeholderId?: number | null; stakeholder?: string | null;
  costCenterId?: number | null; costCenter?: string | null;
}
/** CB-10 / I066: título de contas a pagar/receber candidato a conciliar com o extrato. */
export interface LedgerCandidate {
  id: number; type: 'payable' | 'receivable'; description: string | null;
  dueDate: string; status: string; value: number; party?: string | null;
}
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

  /** CB-13 / I069: ignora a pendência — sai da fila sem ser conciliada. */
  ignore(transactionId: number, ignored = true): Observable<unknown> {
    return this.http.patch(`${this.base}/${transactionId}/ignore`, { ignored });
  }

  /**
   * CB-10 / I066: busca títulos de contas a pagar/receber candidatos à conciliação.
   * A rota já existia no back; a tela nunca a chamava — o campo "Buscar lançamento"
   * do painel da pendência não tinha ligação nenhuma.
   */
  searchEntries(params: { description?: string; value?: number; startDate?: string; endDate?: string }):
    Observable<{ payables: LedgerCandidate[]; receivables: LedgerCandidate[] }> {
    let p = new HttpParams();
    if (params.description) p = p.set('description', params.description);
    if (params.value != null) p = p.set('value', String(params.value));
    if (params.startDate) p = p.set('startDate', params.startDate);
    if (params.endDate) p = p.set('endDate', params.endDate);
    return this.http.get<{ payables: LedgerCandidate[]; receivables: LedgerCandidate[] }>(
      `${this.base}/search-entries`, { params: p },
    );
  }
}
