// src/app/features/purchasing-management/purchasing-management.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { PurchasingReq } from './purchasing-management.model';
import { PurchasesService } from '../purchases/purchases.service';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
  PurchaseRef,
  PurchaseActionKind,
  PurchaseActionResult,
} from '../purchases/purchases.model';
import { Observable } from 'rxjs';

interface State {
  items:       PurchasingReq[];
  total:       number;
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; stage: string; status: PurchaseRequestStatus | '' };
  sort:        { column: keyof PurchasingReq | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<string>;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
}

function toRow(r: PurchaseRequest): PurchasingReq {
  return {
    id:           String(r.id),
    apiId:        r.id,
    typeId:       r.referenceNumber ?? `#${r.id}`,
    title:        r.title,
    costCenter:   r.costCenter?.name ?? '—',
    group:        '—', // a listagem não retorna itens/grupo (pendente no backend)
    requester:    r.requester?.name ?? '—',
    stage:        r.currentStage != null ? `Etapa ${r.currentStage}` : '—',
    reqDate:      formatDate(r.requestDate),
    deliveryDate: formatDate(r.expectedDeliveryDate),
    status:       r.status,
  };
}

@Injectable()
export class PurchasingManagementStore {
  private svc = inject(PurchasesService);

  private readonly state = signal<State>({
    items:       [],
    total:       0,
    loading:     false,
    error:       null,
    filters:     { search: '', stage: '', status: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────
  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly filteredTotal = computed(() => this.state().total);

  /** Itens da página atual, com ordenação client-side aplicada (API não ordena). */
  readonly pageItems = computed(() => {
    const { column, direction } = this.state().sort;
    const items = this.state().items;
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const av = String(a[column] ?? '');
      const bv = String(b[column] ?? '');
      return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

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

  closeDetail(): void {
    this.selected.set(null);
  }

  remove(apiId: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.svc.deleteRequest(apiId).subscribe({
      next: () => { this.closeDetail(); this.load(); onSuccess?.(); },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir a requisição.';
        onError?.(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // ── Modais de ação (cancelar / reiniciar / mover / comprador / aprovadores) ──
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

  closeAction(): void {
    this.action.set(null);
  }

  submitAction(result: PurchaseActionResult, onError?: (msg: string) => void): void {
    const current = this.action();
    if (!current) return;
    const id = current.request.id;

    this.actionSubmitting.set(true);

    let obs: Observable<PurchaseRequest>;
    switch (result.kind) {
      case 'cancel':    obs = this.svc.cancelRequest(id, result.reason ?? ''); break;
      case 'reject':    obs = this.svc.rejectRequest(id, result.reason); break;
      case 'restart':   obs = this.svc.restartRequest(id, result.reason); break;
      case 'move':      obs = this.svc.moveRequest(id, result.stage ?? 1, result.reason); break;
      case 'buyer':     obs = this.svc.changeBuyer(id, { buyerId: result.buyerId ?? 0, reason: result.reason }); break;
      case 'approvers': obs = this.svc.setApprovers(id, { approvers: result.approvers ?? [], reason: result.reason }); break;
    }

    obs.subscribe({
      next: () => { this.actionSubmitting.set(false); this.closeAction(); this.load(); },
      error: err => {
        this.actionSubmitting.set(false);
        const msg = err?.error?.message ?? 'Erro ao executar a ação.';
        onError?.(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  copy(apiId: number): void {
    this.svc.copyRequest(apiId).subscribe({ next: () => this.load(), error: () => {} });
  }

  // ── Load ────────────────────────────────────────────────────────────────────
  load(): void {
    const { page, pageSize } = this.state().pagination;
    const { search, status, stage } = this.state().filters;

    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.svc.getRequests({
      search: search || undefined,
      status: status || undefined,
      stage:  stage ? Number(stage) : undefined,
      skip:   (page - 1) * pageSize,
      take:   pageSize,
    }).subscribe({
      next: res => this.state.update(s => ({
        ...s,
        items:   res.data.map(toRow),
        total:   res.total,
        loading: false,
      })),
      error: err => this.state.update(s => ({
        ...s,
        loading: false,
        error:   err?.error?.message ?? 'Erro ao carregar as requisições.',
      })),
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  setSearch(search: string)                     { this.patchFilter({ search }); }
  setStatus(status: PurchaseRequestStatus | '') { this.patchFilter({ status }); }
  setStage(stage: string)                       { this.patchFilter({ stage }); }

  private patchFilter(patch: Partial<State['filters']>): void {
    this.state.update(s => ({
      ...s,
      filters:    { ...s.filters, ...patch },
      pagination: { ...s.pagination, page: 1 },
    }));
    this.load();
  }

  // ── Ordenação (client-side sobre a página) ────────────────────────────────
  setSort(column: keyof PurchasingReq): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  // ── Paginação ─────────────────────────────────────────────────────────────
  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
    this.load();
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
    this.load();
  }

  // ── Seleção ───────────────────────────────────────────────────────────────
  toggleRow(id: string): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: PurchasingReq[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}
