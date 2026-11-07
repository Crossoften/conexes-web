// src/app/features/purchasing-orders/purchasing-orders.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchaseOrder } from '../purchases/purchases.model';
import { formatCivilDateBR } from '../../shared/utils/format';
import { OrderRow } from './purchasing-orders.model';

// card #720 (CP-01): data civil gravada à meia-noite UTC não recua um dia
const fmtDate = (iso?: string | null): string => formatCivilDateBR(iso);

function fmtCurrency(v?: number | null): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toRow(o: PurchaseOrder): OrderRow {
  return {
    id:         String(o.id),
    apiId:      o.id,
    number:     o.number ?? `#${o.id}`,
    requestRef: o.purchaseRequestId != null ? `REQ-#${o.purchaseRequestId}` : '—',
    supplier:   o.supplier?.name ?? '—',
    totalValue: fmtCurrency(o.totalValue),
    status:     o.status ?? '',
    createdAt:  fmtDate(o.createdAt),
  };
}

interface State {
  items:      OrderRow[];
  loading:    boolean;
  error:      string | null;
  search:     string;
  pagination: { page: number; pageSize: number };
}

@Injectable()
export class PurchasingOrdersStore {
  private svc = inject(PurchasesService);

  private readonly state = signal<State>({
    items:      [],
    loading:    false,
    error:      null,
    search:     '',
    pagination: { page: 1, pageSize: 10 },
  });

  readonly loading    = computed(() => this.state().loading);
  readonly error      = computed(() => this.state().error);
  readonly search     = computed(() => this.state().search);
  readonly pagination = computed(() => this.state().pagination);

  private readonly filtered = computed(() => {
    const s = this.state().search.toLowerCase().trim();
    if (!s) return this.state().items;
    return this.state().items.filter(o =>
      o.number.toLowerCase().includes(s) ||
      o.supplier.toLowerCase().includes(s) ||
      o.requestRef.toLowerCase().includes(s),
    );
  });

  readonly total = computed(() => this.filtered().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.state().pagination;
    return this.filtered().slice((page - 1) * pageSize, page * pageSize);
  });

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getOrders({ take: 200 }).subscribe({
      next: res => this.state.update(s => ({ ...s, items: res.data.map(toRow), loading: false })),
      error: err => this.state.update(s => ({
        ...s,
        loading: false,
        error:   err?.error?.message ?? 'Erro ao carregar os pedidos.',
      })),
    });
  }

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, search, pagination: { ...s.pagination, page: 1 } }));
  }

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
  }

  // ── Detalhe ────────────────────────────────────────────────────────────────
  readonly selected      = signal<PurchaseOrder | null>(null);
  readonly detailLoading = signal(false);

  openDetail(apiId: number): void {
    this.selected.set(null);
    this.detailLoading.set(true);
    this.svc.getOrderById(apiId).subscribe({
      next: o  => { this.selected.set(o); this.detailLoading.set(false); },
      error: () => { this.detailLoading.set(false); },
    });
  }

  closeDetail(): void { this.selected.set(null); }
}
