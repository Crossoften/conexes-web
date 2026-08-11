// src/app/features/financial-transfers/financial-transfers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateBankTransferPayload, BankAccountOption, FinancialTransfer, TransferView } from './financial-transfers.model';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

@Injectable({ providedIn: 'root' })
export class FinancialTransfersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/banking/transfers`;
  private entriesUrl = `${environment.apiUrl}/v1/banking/entries`;

  /**
   * Lista transferências (view TRANSFERS) ou lançamentos bancários (view ENTRIES).
   * Ambos os endpoints devolvem array puro; a paginação/ordenação são feitas no store.
   */
  getAll(view: TransferView): Observable<FinancialTransfer[]> {
    const url = view === 'ENTRIES' ? this.entriesUrl : this.base;
    return this.http.get<unknown>(url).pipe(map(res => {
      const rows: any[] = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
      return rows.map(r => view === 'ENTRIES' ? this.mapEntry(r) : this.mapTransfer(r));
    }));
  }

  private mapTransfer(r: any): FinancialTransfer {
    return {
      id: String(r.id),
      code: `#${r.id}`,
      description: r.description ?? '—',
      origin: r.originAccount?.nickname ?? `Conta #${r.originAccountId ?? '—'}`,
      destination: r.destinationAccount?.nickname ?? `Conta #${r.destinationAccountId ?? '—'}`,
      operationDate: fmtDate(r.operationDate),
      value: brl.format(r.amount ?? 0),
      status: 'COMPLETED',
      type: 'TED',
    };
  }

  private mapEntry(r: any): FinancialTransfer {
    const isCredit = r.type === 'Credit';
    return {
      id: String(r.id),
      code: `#${r.id}`,
      description: r.description ?? '—',
      origin: r.bankAccount?.nickname ?? `Conta #${r.bankAccountId ?? '—'}`,
      destination: isCredit ? 'Crédito (entrada)' : 'Débito (saída)',
      operationDate: fmtDate(r.date ?? r.operationDate),
      value: brl.format(r.amount ?? 0),
      status: r.reconciled ? 'COMPLETED' : 'PENDING',
      type: 'TED',
    };
  }

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
