// src/app/features/financial-transfers/financial-transfers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateBankTransferPayload, CreateBankEntryPayload, BankAccountOption, FinancialTransfer, ImportBatch, ImportBatchListResult, TransferView } from './financial-transfers.model';

/** TR-12 / LB-07: filtros aceitos pelos endpoints de transferência e lançamento. */
export interface MovementQuery {
  startDate: string;
  endDate: string;
  originAccountId: string;
  destinationAccountId: string;
  bankAccountId: string;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  // FN-02: força UTC para não deslocar a data um dia no fuso BR (off-by-one).
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

@Injectable({ providedIn: 'root' })
export class FinancialTransfersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/banking/transfers`;
  private entriesUrl = `${environment.apiUrl}/v1/banking/entries`;
  // TR-14/LB-10: os lotes ficam fora de transfers/entries — é outro recurso.
  private baseBanking = `${environment.apiUrl}/v1/banking`;

  /**
   * Lista transferências (view TRANSFERS) ou lançamentos bancários (view ENTRIES).
   * Ambos os endpoints devolvem array puro; a paginação/ordenação são feitas no store.
   */
  getAll(view: TransferView, filtros?: Partial<MovementQuery>): Observable<FinancialTransfer[]> {
    const url = view === 'ENTRIES' ? this.entriesUrl : this.base;

    // TR-12 / LB-07: os filtros vão para o servidor. Origem e destino só existem
    // em Transferências; conta bancária só em Lançamentos.
    let params = new HttpParams();
    if (filtros?.startDate) params = params.set('startDate', filtros.startDate);
    if (filtros?.endDate)   params = params.set('endDate', filtros.endDate);
    if (view === 'ENTRIES') {
      if (filtros?.bankAccountId) params = params.set('bankAccountId', filtros.bankAccountId);
    } else {
      if (filtros?.originAccountId)      params = params.set('originAccountId', filtros.originAccountId);
      if (filtros?.destinationAccountId) params = params.set('destinationAccountId', filtros.destinationAccountId);
    }

    return this.http.get<unknown>(url, { params }).pipe(map(res => {
      const rows: any[] = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
      return rows.map(r => view === 'ENTRIES' ? this.mapEntry(r) : this.mapTransfer(r));
    }));
  }

  /** LB-06 / B5: duplica um lançamento bancário no servidor. */
  copyEntry(id: string | number): Observable<unknown> {
    return this.http.post<unknown>(`${this.entriesUrl}/${id}/copy`, {});
  }

  /** B5: carrega um lançamento para edição. */
  getEntry(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.entriesUrl}/${id}`);
  }

  /** B5: salva a edição de um lançamento. */
  updateEntry(id: string | number, payload: Partial<CreateBankEntryPayload>): Observable<unknown> {
    return this.http.patch<unknown>(`${this.entriesUrl}/${id}`, payload);
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
      originAccountId: r.originAccountId ?? undefined,
      destinationAccountId: r.destinationAccountId ?? undefined,
      rawAmount: r.amount ?? undefined,
      rawDate: r.operationDate ?? undefined,
      observation: r.observation ?? undefined,
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

  /** Lançamento avulso (POST /v1/banking/entries). */
  createEntry(payload: CreateBankEntryPayload): Observable<unknown> {
    return this.http.post<unknown>(this.entriesUrl, payload);
  }

  /**
   * Importa em lote por planilha, conforme a visão:
   * TRANSFERS → POST /v1/banking/transfers/import · ENTRIES → POST /v1/banking/entries/import.
   */
  importFile(file: File, view: TransferView): Observable<unknown> {
    const url = `${view === 'ENTRIES' ? this.entriesUrl : this.base}/import`;
    const form = new FormData();
    form.append('file', file);
    return this.http.post<unknown>(url, form);
  }

  /**
   * TR-13/LB-09: o modelo de planilha que faltava. A tela tinha "Upload arquivo"
   * e nada para baixar — quem importava adivinhava a ordem das colunas.
   */
  downloadTemplate(view: TransferView): Observable<Blob> {
    const url = `${view === 'ENTRIES' ? this.entriesUrl : this.base}/import/template`;
    return this.http.get(url, { responseType: 'blob' });
  }

  // ── TR-14/LB-10: lotes de importação ──────────────────────────────────────
  /** Os lotes da visão aberta, do mais recente para o mais antigo. */
  listImportBatches(view: TransferView): Observable<ImportBatchListResult> {
    const params = new HttpParams()
      .set('kind', view === 'ENTRIES' ? 'entries' : 'transfers')
      .set('take', 50)
      .set('skip', 1);
    return this.http
      .get<{ data: ImportBatch[]; count: number }>(`${this.baseBanking}/import-batches`, { params })
      .pipe(map(r => ({ items: r?.data ?? [], total: r?.count ?? 0 })));
  }

  /** Desfaz a importação inteira: remove tudo que aquele lote criou. */
  deleteImportBatch(id: number): Observable<{ message: string; transferenciasRemovidas: number; lancamentosRemovidos: number }> {
    return this.http.delete<any>(`${this.baseBanking}/import-batches/${id}`);
  }

  /** Exclui conforme a visão: transferência ou lançamento bancário. */
  delete(id: string | number, view: TransferView): Observable<void> {
    const url = view === 'ENTRIES' ? this.entriesUrl : this.base;
    return this.http.delete<void>(`${url}/${id}`);
  }
}
