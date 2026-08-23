// src/app/features/accounts-payable/accounts-payable.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PayableAccount, SummaryCard, AdvancedFilters } from './accounts-payable.model';

/** Envelope de listagem padrão do back ({ data, count, pages }). */
interface ListEnvelope<T> {
  data: T[];
  count: number;
  pages: number;
}

/** Item cru de conta a pagar como o back devolve. */
interface ApiAccountPayable {
  id: number;
  document?: string | null;
  type?: string | null;
  description?: string | null;
  history?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  registrationDate?: string | null;
  createdAt?: string | null;
  grossAmount?: number | null;
  netAmount?: number | null;
  amount?: number | null;
  amountPaid?: number | null;
  status?: string | null;
  stakeholder?: { name?: string | null } | null;
}

export interface PayableListResult {
  items: PayableAccount[];
  total: number;
  pages: number;
}

const STATUS_LABEL: Record<string, string> = {
  Open: 'Em aberto',
  PartiallyPaid: 'Parcialmente pago',
  Paid: 'Pago',
  Cancelled: 'Cancelado',
  Reconciled: 'Conciliado',
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable({ providedIn: 'root' })
export class AccountsPayableService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/accounts-payable`;

  // ── Listagem ────────────────────────────────────────────────────────────
  getAll(filters: AdvancedFilters = {} as AdvancedFilters, take = 10, skip = 0): Observable<PayableListResult> {
    let params = new HttpParams().set('take', take).set('skip', skip);

    if (filters.status)         params = params.set('status', filters.status);
    if (filters.supplier)       params = params.set('supplierId', filters.supplier);
    if (filters.remittanceStatus) params = params.set('remittanceStatus', filters.remittanceStatus);
    if (filters.expenseType)    params = params.set('expenseType', filters.expenseType);
    if (filters.paymentType)    params = params.set('paymentMethod', filters.paymentType);
    if (filters.contract)       params = params.set('contractId', filters.contract);
    if (filters.requisition)    params = params.set('purchaseRequestId', filters.requisition);
    if (filters.payingAccount)  params = params.set('bankAccountId', filters.payingAccount);

    return this.http.get<ListEnvelope<ApiAccountPayable>>(this.base, { params }).pipe(
      map(res => ({
        items: (res?.data ?? []).map(this.toModel),
        total: res?.count ?? 0,
        pages: res?.pages ?? 0,
      })),
    );
  }

  // ── Detalhe ─────────────────────────────────────────────────────────────
  getById(id: number): Observable<ApiAccountPayable> {
    return this.http.get<ApiAccountPayable>(`${this.base}/${id}`);
  }

  // ── Criação / edição / exclusão ─────────────────────────────────────────
  create(payload: unknown): Observable<ApiAccountPayable> {
    return this.http.post<ApiAccountPayable>(this.base, payload);
  }

  /** FIN-01: registra baixa (pagamento) total ou parcial. */
  registerPayment(id: number, payload: { amount?: number; paymentDate: string; bankAccountId?: number; installmentId?: number; note?: string }): Observable<ApiAccountPayable> {
    return this.http.post<ApiAccountPayable>(`${this.base}/${id}/payments`, payload);
  }

  /** FIN-03: renegocia o saldo pendente gerando um novo título. */
  renegotiate(id: number, payload: { interest?: number; fine?: number; discount?: number; installmentsCount: number; firstDueDate: string; note?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/renegotiate`, payload);
  }

  update(id: number, payload: unknown): Observable<ApiAccountPayable> {
    return this.http.patch<ApiAccountPayable>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Ações avançadas ─────────────────────────────────────────────────────
  copy(id: number): Observable<ApiAccountPayable> {
    return this.http.post<ApiAccountPayable>(`${this.base}/${id}/copy`, {});
  }

  multiply(id: number, times: number, intervalDays: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/multiply`, { times, intervalDays });
  }

  bulkUpdateDueDate(ids: number[], dueDate: string): Observable<unknown> {
    return this.http.patch(`${this.base}/bulk/due-date`, { ids, dueDate });
  }

  sendToRemittance(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/send-to-remittance`, {});
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  // ── Resumo (sem endpoint dedicado): computa a partir da página carregada ──
  buildSummaries(items: PayableAccount[], raw: ApiAccountPayable[]): SummaryCard[] {
    const totalNet = raw.reduce((acc, r) => acc + (r.netAmount ?? r.amount ?? 0), 0);
    const abertos = raw.filter(r => r.status === 'Open').reduce((a, r) => a + (r.netAmount ?? r.amount ?? 0), 0);
    const pagos = raw.filter(r => r.status === 'Paid').reduce((a, r) => a + (r.netAmount ?? r.amount ?? 0), 0);
    return [
      { title: 'Total de contas', credit: brl.format(0), debit: brl.format(totalNet) },
      { title: 'Em aberto', credit: brl.format(0), debit: brl.format(abertos) },
      { title: 'Pago', credit: brl.format(0), debit: brl.format(pagos) },
    ];
  }

  // ── Mapper back → front (o model do front é todo string formatada) ───────
  private toModel = (r: ApiAccountPayable): PayableAccount => ({
    id: String(r.id),
    displayId: `#${r.id}`,
    type: r.type ?? '—',
    document: r.document ?? '—',
    company: r.stakeholder?.name ?? '—',
    history: r.history ?? r.description ?? '—',
    registrationDate: fmtDate(r.registrationDate ?? r.createdAt),
    issueDate: fmtDate(r.issueDate),
    dueDate: fmtDate(r.dueDate),
    value: brl.format(r.netAmount ?? r.amount ?? 0),
    status: STATUS_LABEL[r.status ?? ''] ?? (r.status ?? '—'),
    // FIN-01: saldo e situação crua para a ação de baixa.
    rawStatus: r.status ?? 'Open',
    balanceNum: Math.max(0, (r.netAmount ?? r.amount ?? r.grossAmount ?? 0) - (r.amountPaid ?? 0)),
    balance: brl.format(Math.max(0, (r.netAmount ?? r.amount ?? r.grossAmount ?? 0) - (r.amountPaid ?? 0))),
    canPay: (r.status === 'Open' || r.status === 'PartiallyPaid'),
  });
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}
