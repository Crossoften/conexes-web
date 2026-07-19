// src/app/features/quotations/quotations.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Quotation } from './quotations.model';
import { PurchasesService } from '../purchases/purchases.service';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
  PurchaseRef,
  PurchaseActionKind,
  PurchaseActionResult,
} from '../purchases/purchases.model';

export type SortDirection = 'asc' | 'desc' | '';

interface State {
  items:       Quotation[];
  loading:     boolean;
  error:       string | null;
  routeStage:  number;
  filters:     { search: string; status: PurchaseRequestStatus | ''; requester: string; project: string };
  sort:        { column: keyof Quotation | ''; direction: SortDirection };
  pagination:  { page: number; pageSize: number };
  selected:    Set<string>;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
}

function toRow(r: PurchaseRequest): Quotation {
  return {
    id:           String(r.id),
    apiId:        r.id,
    typeId:       r.referenceNumber ?? `#${r.id}`,
    title:        r.title,
    costCenter:   r.costCenter?.name ?? '—',
    group:        '—',
    requester:    r.requester?.name ?? '—',
    buyer:        r.buyer?.name ?? '—',
    requestDate:  formatDate(r.requestDate),
    deliveryDate: formatDate(r.expectedDeliveryDate),
    reqStatus:    r.status,
  };
}

@Injectable()
export class QuotationsStore {
  private svc = inject(PurchasesService);

  private readonly state = signal<State>({
    items:      [],
    loading:    false,
    error:      null,
    routeStage: 0,
    filters:    { search: '', status: '', requester: '', project: '' },
    sort:       { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selected:   new Set(),
  });

  // ── Selectors ───────────────────────────────────────────────────────────────
  readonly loading    = computed(() => this.state().loading);
  readonly error      = computed(() => this.state().error);
  readonly filters    = computed(() => this.state().filters);
  readonly sort       = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selected);

  private readonly afterFilter = computed(() => {
    const { search, status, requester, project } = this.state().filters;
    const s = search.toLowerCase();
    return this.state().items.filter(q =>
      (!search    || q.title.toLowerCase().includes(s) || q.typeId.toLowerCase().includes(s)) &&
      (!status    || q.reqStatus === status) &&
      (!requester || q.requester.toLowerCase().includes(requester.toLowerCase())) &&
      (!project   || q.group.toLowerCase().includes(project.toLowerCase())),
    );
  });

  private readonly afterSort = computed(() => {
    const { column, direction } = this.state().sort;
    if (!column || !direction) return this.afterFilter();
    return [...this.afterFilter()].sort((a, b) => {
      const va = String(a[column] ?? '').toLowerCase();
      const vb = String(b[column] ?? '').toLowerCase();
      return direction === 'asc' ? va.localeCompare(vb, 'pt-BR') : vb.localeCompare(va, 'pt-BR');
    });
  });

  readonly filteredTotal = computed(() => this.afterSort().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.state().pagination;
    return this.afterSort().slice((page - 1) * pageSize, page * pageSize);
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(q => this.selectedIds().has(q.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(q => this.selectedIds().has(q.id)) && !this.allPageSelected();
  });

  // ── Load por etapa ────────────────────────────────────────────────────────
  /**
   * routeStage: 0..5 = Etapas 1..6; 6 = Histórico.
   * Etapas 1..5 -> /requests/stage/{n}; Etapa 6 (finalizados) -> status Completed;
   * Histórico -> /requests/history.
   */
  load(routeStage: number): void {
    this.state.update(s => ({ ...s, routeStage, loading: true, error: null }));

    let req$: Observable<{ data: PurchaseRequest[]; total: number }>;
    if (routeStage === 6)      req$ = this.svc.getRequestHistory({ take: 200 });
    else if (routeStage === 5) req$ = this.svc.getRequests({ status: 'Completed', take: 200 });
    else                       req$ = this.svc.getRequestsByStage(routeStage + 1);

    req$.subscribe({
      next: res => this.state.update(s => ({ ...s, items: res.data.map(toRow), loading: false })),
      error: err => this.state.update(s => ({
        ...s,
        loading: false,
        error:   err?.error?.message ?? 'Erro ao carregar as requisições.',
      })),
    });
  }

  private reload(): void {
    this.load(this.state().routeStage);
  }

  // ── Filtros / ordenação / paginação (client-side) ─────────────────────────
  setSearch(search: string)                     { this.patchFilter({ search }); }
  setStatus(status: PurchaseRequestStatus | '') { this.patchFilter({ status }); }
  setRequester(requester: string)               { this.patchFilter({ requester }); }
  setProject(project: string)                   { this.patchFilter({ project }); }

  private patchFilter(patch: Partial<State['filters']>): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, ...patch }, pagination: { ...s.pagination, page: 1 } }));
  }

  setSort(column: keyof Quotation): void {
    this.state.update(s => {
      const same = s.sort.column === column;
      const direction: SortDirection = same
        ? (s.sort.direction === 'asc' ? 'desc' : s.sort.direction === 'desc' ? '' : 'asc')
        : 'asc';
      return { ...s, sort: { column: direction ? column : '', direction } };
    });
  }

  setPage(page: number)         { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { pageSize, page: 1 } })); }

  toggleRow(id: string): void {
    this.state.update(s => {
      const next = new Set(s.selected);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...s, selected: next };
    });
  }

  toggleAllPage(items: Quotation[]): void {
    this.state.update(s => {
      const next = new Set(s.selected);
      const all = items.every(i => next.has(i.id));
      items.forEach(i => all ? next.delete(i.id) : next.add(i.id));
      return { ...s, selected: next };
    });
  }

  // ── Detalhe (modal de visualização) ─────────────────────────────────────────
  readonly selected      = signal<PurchaseRequest | null>(null);
  readonly detailLoading = signal(false);

  openDetail(apiId: number): void {
    this.selected.set(null);
    this.detailLoading.set(true);
    this.svc.getRequestById(apiId).subscribe({
      next: req => { this.selected.set(req); this.detailLoading.set(false); },
      error: ()  => { this.detailLoading.set(false); },
    });
  }

  closeDetail(): void { this.selected.set(null); }

  // ── Modal de cotações (FE-7) ────────────────────────────────────────────────
  readonly quotationsFor = signal<{ id: number; code: string } | null>(null);

  openQuotations(item: Quotation): void {
    this.quotationsFor.set({ id: item.apiId, code: item.typeId });
  }

  closeQuotations(): void { this.quotationsFor.set(null); }

  // ── Modal de adjudicação (FE-8) ─────────────────────────────────────────────
  readonly awardFor = signal<{ id: number; code: string } | null>(null);

  openAward(item: Quotation): void {
    this.awardFor.set({ id: item.apiId, code: item.typeId });
  }

  closeAward(): void { this.awardFor.set(null); }

  /** Após adjudicar, a requisição migra de etapa — recarrega a lista. */
  onAwarded(): void { this.awardFor.set(null); this.reload(); }

  // ── Modais de ação + ações diretas ──────────────────────────────────────────
  readonly action           = signal<{ kind: PurchaseActionKind; request: PurchaseRequest } | null>(null);
  readonly users            = signal<PurchaseRef[]>([]);
  readonly actionSubmitting = signal(false);

  openAction(kind: PurchaseActionKind, apiId: number): void {
    if ((kind === 'buyer' || kind === 'approvers') && this.users().length === 0) {
      this.svc.getUsersLookup().subscribe({ next: u => this.users.set(u), error: () => {} });
    }
    this.svc.getRequestById(apiId).subscribe({
      next: req => this.action.set({ kind, request: req }),
      error: () => {},
    });
  }

  closeAction(): void { this.action.set(null); }

  submitAction(result: PurchaseActionResult, onError?: (msg: string) => void): void {
    const current = this.action();
    if (!current) return;
    const id = current.request.id;
    this.actionSubmitting.set(true);

    let obs: Observable<PurchaseRequest>;
    switch (result.kind) {
      case 'cancel':          obs = this.svc.cancelRequest(id, result.reason ?? ''); break;
      case 'reject':          obs = this.svc.rejectRequest(id, result.reason); break;
      case 'request-changes': obs = this.svc.requestChanges(id, result.reason); break;
      case 'restart':   obs = this.svc.restartRequest(id, result.reason); break;
      case 'move':      obs = this.svc.moveRequest(id, result.stage ?? 1, result.reason); break;
      case 'buyer':     obs = this.svc.changeBuyer(id, { buyerId: result.buyerId ?? 0, reason: result.reason }); break;
      case 'approvers': obs = this.svc.setApprovers(id, { approvers: result.approvers ?? [], reason: result.reason }); break;
    }

    obs.subscribe({
      next: () => { this.actionSubmitting.set(false); this.closeAction(); this.reload(); },
      error: err => {
        this.actionSubmitting.set(false);
        const msg = err?.error?.message ?? 'Erro ao executar a ação.';
        onError?.(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  /** Etapa 1 → 2: envia a requisição para aprovação. */
  submit(apiId: number): void {
    this.svc.submitRequest(apiId).subscribe({ next: () => this.reload(), error: () => {} });
  }

  approve(apiId: number): void {
    this.svc.approveRequest(apiId).subscribe({ next: () => this.reload(), error: () => {} });
  }

  /** Etapa 3: exportar a requisição aprovada para cotação (FE-5b). */
  exportToQuotation(apiId: number): void {
    this.svc.exportRequestToQuotation(apiId).subscribe({ next: () => this.reload(), error: () => {} });
  }

  /** Etapa 5 → 6: concluir o pedido. */
  complete(apiId: number): void {
    this.svc.completeRequest(apiId).subscribe({ next: () => this.reload(), error: () => {} });
  }

  /** Exportar a requisição em PDF (gerado no back). */
  exportPdf(apiId: number): void {
    this.svc.generateRequestPdf(apiId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `requisicao-${apiId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }

  copy(apiId: number): void {
    this.svc.copyRequest(apiId).subscribe({ next: () => this.reload(), error: () => {} });
  }

  exportExcel(apiId: number): void {
    this.svc.generateRequestExcel(apiId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pedido-${apiId}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }

  remove(apiId: number): void {
    this.svc.deleteRequest(apiId).subscribe({ next: () => this.reload(), error: () => {} });
  }
}
