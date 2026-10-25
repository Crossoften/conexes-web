// src/app/features/accounts-receivable/accounts-receivable.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReceivableAccount, SummaryCard, ReceivableFilters, FilterOption } from './accounts-receivable.model';

interface ListEnvelope<T> { data: T[]; count: number; pages: number; }

/** Resposta de GET /accounts-receivable/summary (CR-01). */
interface ReceivableSummaryLine { total: number; count: number }
export interface ReceivableSummary {
  total: ReceivableSummaryLine;
  open: ReceivableSummaryLine;
  partiallyPaid: ReceivableSummaryLine;
  paid: ReceivableSummaryLine;
  balance: number;
  received: number;
  byStatus: { status: string; total: number; count: number }[];
}

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
  /** E2: parcelas, quando o título já foi dividido. */
  installments?: { id: number; installment: number; dueDate?: string | null; amount?: number | null; amountReceived?: number | null; status?: string | null }[] | null;
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

  /** CR-01: filtros compartilhados por listagem, resumo e exportação. */
  private filterParams(filters: ReceivableFilters = {} as ReceivableFilters): HttpParams {
    let params = new HttpParams();
    if (filters.status)     params = params.set('status', filters.status);
    if (filters.contractor) params = params.set('stakeholderId', filters.contractor);
    // CR-02/I092: o servidor já aceitava partnershipId; faltava a tela mandá-lo.
    if (filters.partnership) params = params.set('partnershipId', filters.partnership);
    // CR-01: o campo "Período" era texto livre e nunca chegava ao servidor.
    if (filters.dateStart)  params = params.set('startDate', filters.dateStart);
    if (filters.dateEnd)    params = params.set('endDate', filters.dateEnd);
    if (filters.dateField && (filters.dateStart || filters.dateEnd)) {
      params = params.set('dateField', filters.dateField);
    }
    return params;
  }

  /**
   * `page` é o NÚMERO DA PÁGINA (1-based), não offset: o back usa `skip` como
   * página. A tela mandava `(page-1)*pageSize`, então a página 2 pedia a
   * página 10 e vinha vazia — o mesmo defeito já corrigido em Contas a pagar.
   */
  getAll(filters: ReceivableFilters = {} as ReceivableFilters, take = 10, page = 1): Observable<ReceivableListResult> {
    const params = this.filterParams(filters).set('take', take).set('skip', Math.max(1, page));

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

  /** CR-04: edição do título — envia só o que a tela edita. */
  update(id: number, payload: unknown): Observable<ApiAccountReceivable> {
    return this.http.patch<ApiAccountReceivable>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** CR-01: a exportação leva os filtros da tela — antes baixava a base inteira. */
  exportExcel(filters: ReceivableFilters = {} as ReceivableFilters): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { params: this.filterParams(filters), responseType: 'blob' });
  }

  /** E2: divide o título em parcelas (o back já fazia; faltava o comando na tela). */
  splitInstallments(id: number, count: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/installments`, { count });
  }

  // ── Opções dos filtros (CR-02) ──────────────────────────────────────────
  readonly statusOptions: FilterOption[] =
    Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

  // CR-02/I092: mesmas bases de data de Contas a pagar (menos Competência, que
  // ainda não existe no título a receber).
  readonly dateFieldOptions: FilterOption[] = [
    { value: 'dueDate',   label: 'Vencimento' },
    { value: 'issueDate', label: 'Emissão' },
    { value: 'createdAt', label: 'Cadastro' },
  ];

  /** CR-02/I092: termos/parcerias para o filtro que o servidor já aceitava. */
  getPartnerships(): Observable<FilterOption[]> {
    return this.http.get<unknown>(`${environment.apiUrl}/v1/partnerships`, { params: new HttpParams().set('take', 500) }).pipe(
      map(res => {
        const rows: any[] = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
        return rows.map(t => ({
          value: String(t.id),
          label: [t.termNumber ?? t.number, t.title ?? t.name].filter(Boolean).join(' — ') || `Termo #${t.id}`,
        }));
      }),
    );
  }

  /** CR-02: contratantes para o filtro, que era uma caixa de texto. */
  getContractors(): Observable<FilterOption[]> {
    return this.http.get<unknown>(`${environment.apiUrl}/v1/stakeholders`, { params: new HttpParams().set('take', 500) }).pipe(
      map(res => {
        const rows: any[] = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
        return rows.map(r => ({ value: String(r.id), label: String(r.name ?? r.tradeName ?? `#${r.id}`) }));
      }),
    );
  }

  /**
   * CR-01: resumo agregado no servidor. A tela somava os cards no navegador,
   * sobre a página carregada — com filtro aplicado os valores mentiam sempre.
   */
  getSummary(filters: ReceivableFilters = {} as ReceivableFilters): Observable<SummaryCard[]> {
    return this.http.get<ReceivableSummary>(`${this.base}/summary`, { params: this.filterParams(filters) }).pipe(
      map(s => this.buildSummaries(s)),
    );
  }

  /** FIN-01: registra recebimento (baixa) total ou parcial. */
  /** CR-03: contas bancárias para o seletor do modal de recebimento. */
  getBankAccounts(): Observable<{ id: number; label: string }[]> {
    return this.http.get<unknown>(`${environment.apiUrl}/v1/institutional/bank-accounts`).pipe(
      map(res => {
        const rows: any[] = Array.isArray(res) ? res : (res as { data?: any[] })?.data ?? [];
        return rows.map(r => ({
          id: Number(r.id),
          label: r.nickname || (r.bankName ? `${r.bankName} — ${r.account ?? ''}` : `Conta #${r.id}`),
        }));
      }),
    );
  }

  registerReceipt(id: number, payload: { amount?: number; receiptDate: string; bankAccountId?: number; note?: string; interest?: number; fine?: number; discount?: number }): Observable<ApiAccountReceivable> {
    return this.http.post<ApiAccountReceivable>(`${this.base}/${id}/receipts`, payload);
  }

  /** FIN-03: renegocia o saldo a receber gerando um novo título. */
  renegotiate(id: number, payload: { interest?: number; fine?: number; discount?: number; installmentsCount: number; firstDueDate: string; note?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/renegotiate`, payload);
  }

  /** CR-01/I091: copiar o título — a ação existia em Contas a pagar e não aqui. */
  copy(id: number): Observable<ApiAccountReceivable> {
    return this.http.post<ApiAccountReceivable>(`${this.base}/${id}/copy`, {});
  }

  /** CR-01/I091: o título completo, para a janela de visualização. */
  getOne(id: number): Observable<ApiAccountReceivable> {
    return this.http.get<ApiAccountReceivable>(`${this.base}/${id}`);
  }

  /**
   * CR-01: monta os cards a partir do resumo do servidor. Antes recebia a página
   * carregada e somava no navegador — a partir do segundo título fora da página
   * os valores mentiam, e com filtro aplicado mentiam sempre.
   */
  buildSummaries(s: ReceivableSummary): SummaryCard[] {
    const card = (title: string, linha: { total: number; count: number }): SummaryCard => ({
      title: `${title} (${linha.count})`,
      credit: brl.format(linha.total),
      debit: brl.format(0),
    });
    return [
      card('Total de contas', s.total),
      card('Em aberto', s.open),
      card('Parcialmente recebido', s.partiallyPaid),
      card('Recebido', s.paid),
      { title: 'Saldo a receber', credit: brl.format(s.balance), debit: brl.format(0) },
    ];
  }

  private toModel = (r: ApiAccountReceivable): ReceivableAccount => ({
    id: String(r.id),
    code: `#${r.id}`,
    contractorDoc: r.document ?? '—',
    contractorName: r.stakeholder?.name ?? '—',
    issueDate: fmtDate(r.issueDate),
    // CR-01: o vencimento vinha na resposta e a tela descartava — era a coluna
    // que mais importa numa lista de cobrança.
    dueDate: fmtDate(r.dueDate),
    installmentsCount: (r.installments ?? []).length,
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

// FIN-N03: datas civis renderizadas em UTC, igual a Contas a pagar e Transferências.
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
