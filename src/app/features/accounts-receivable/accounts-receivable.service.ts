// src/app/features/accounts-receivable/accounts-receivable.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReceivableAccount, SummaryCard, ReceivableFilters } from './accounts-receivable.model';

interface ListEnvelope<T> { data: T[]; count: number; pages: number; }

interface ApiAccountReceivable {
  id: number;
  document?: string | null;
  invoiceNumber?: string | null;
  description?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  amount?: number | null;
  amountReceived?: number | null;
  status?: string | null;
  asaasInvoiceUrl?: string | null;
  stakeholder?: { name?: string | null } | null;
}

export interface ReceivableListResult {
  items: ReceivableAccount[];
  total: number;
  pages: number;
  raw: ApiAccountReceivable[];
}

const STATUS_LABEL: Record<string, string> = {
  Open: 'Em aberto', PartiallyPaid: 'Parcialmente recebido', Paid: 'Recebido', Cancelled: 'Cancelado', Reconciled: 'Conciliado',
};
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable({ providedIn: 'root' })
export class AccountsReceivableService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/accounts-receivable`;

  getAll(filters: ReceivableFilters = {} as ReceivableFilters, take = 10, skip = 0): Observable<ReceivableListResult> {
    let params = new HttpParams().set('take', take).set('skip', skip);
    if (filters.status)     params = params.set('status', filters.status);
    if (filters.contractor) params = params.set('stakeholderId', filters.contractor);

    return this.http.get<ListEnvelope<ApiAccountReceivable>>(this.base, { params }).pipe(
      map(res => ({
        items: (res?.data ?? []).map(this.toModel),
        total: res?.count ?? 0,
        pages: res?.pages ?? 0,
        raw: res?.data ?? [],
      })),
    );
  }

  getById(id: number): Observable<ApiAccountReceivable> {
    return this.http.get<ApiAccountReceivable>(`${this.base}/${id}`);
  }

  // NF-e IMPORT — POST /v1/accounts-receivable/import-xml (campo files[])
  importXml(files: File[]): Observable<unknown> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return this.http.post(`${this.base}/import-xml`, form);
  }

  create(payload: unknown): Observable<ApiAccountReceivable> {
    return this.http.post<ApiAccountReceivable>(this.base, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  /** FIN-01: registra recebimento (baixa) total ou parcial. */
  registerReceipt(id: number, payload: { amount?: number; receiptDate: string; bankAccountId?: number; note?: string }): Observable<ApiAccountReceivable> {
    return this.http.post<ApiAccountReceivable>(`${this.base}/${id}/receipts`, payload);
  }

  /** FIN-03: renegocia o saldo a receber gerando um novo título. */
  renegotiate(id: number, payload: { interest?: number; fine?: number; discount?: number; installmentsCount: number; firstDueDate: string; note?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/renegotiate`, payload);
  }

  buildSummaries(raw: ApiAccountReceivable[]): SummaryCard[] {
    const total = raw.reduce((a, r) => a + (r.amount ?? 0), 0);
    const abertos = raw.filter(r => r.status === 'Open').reduce((a, r) => a + (r.amount ?? 0), 0);
    const recebidos = raw.filter(r => r.status === 'Paid').reduce((a, r) => a + (r.amount ?? 0), 0);
    return [
      { title: 'Total a receber', credit: brl.format(total), debit: '' },
      { title: 'Em aberto', credit: brl.format(abertos), debit: '' },
      { title: 'Recebido', credit: brl.format(recebidos), debit: '' },
    ];
  }

  private toModel = (r: ApiAccountReceivable): ReceivableAccount => ({
    id: String(r.id),
    code: `#${r.id}`,
    contractorDoc: r.document ?? '—',
    contractorName: r.stakeholder?.name ?? '—',
    issueDate: fmtDate(r.issueDate),
    invoiceNumber: r.invoiceNumber ?? r.document ?? '—',
    status: STATUS_LABEL[r.status ?? ''] ?? (r.status ?? '—'),
    // FIN-01: valor, saldo e situação crua para a baixa (recebimento).
    value: brl.format(r.amount ?? 0),
    rawStatus: r.status ?? 'Open',
    balanceNum: Math.max(0, (r.amount ?? 0) - (r.amountReceived ?? 0)),
    balance: brl.format(Math.max(0, (r.amount ?? 0) - (r.amountReceived ?? 0))),
    canReceive: (r.status === 'Open' || r.status === 'PartiallyPaid'),
  });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}
