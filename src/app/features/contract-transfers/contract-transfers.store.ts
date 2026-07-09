// src/app/features/contract-transfers/contract-transfers.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import {
  PartnershipListItem,
  PartnershipRow,
  PartnershipStatus,
} from './contract-transfers.model';
import { ContractTransfersService } from './contract-transfers.service';
import { NotificationService } from '../../shared/services/notification.service';
import { formatBRL } from '../../shared/utils/format';

interface State {
  items:       PartnershipListItem[];
  total:       number;
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; status: PartnershipStatus | '' };
  sort:        { column: keyof PartnershipRow | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;
  expandedIds: Set<number>;
}

@Injectable()
export class ContractTransfersStore {
  private svc    = inject(ContractTransfersService);
  private notify = inject(NotificationService);

  private readonly state = signal<State>({
    items:       [],
    total:       0,
    loading:     false,
    error:       null,
    filters:     { search: '', status: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    expandedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly expandedIds = computed(() => this.state().expandedIds);
  readonly filteredTotal = computed(() => this.state().total);

  /** Linhas da página atual (mapeadas + ordenação client-side dentro da página). */
  readonly pageItems = computed<PartnershipRow[]>(() => {
    const rows = this.state().items.map(p => this.toRow(p));
    const { column, direction } = this.state().sort;
    if (!column || !direction) return rows;
    const dir = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) =>
      String(a[column]).localeCompare(String(b[column]), 'pt-BR', { numeric: true }) * dir
    );
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // ── Load ──────────────────────────────────────────────────────────────────

  load(): void {
    const { page, pageSize } = this.state().pagination;
    const { search, status } = this.state().filters;

    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.svc.getAll({
      title:  search || undefined,
      status: status || undefined,
      skip:   (page - 1) * pageSize,
      take:   pageSize,
    }).subscribe({
      next: pageRes => this.state.update(s => ({
        ...s,
        items:   pageRes.data,
        total:   pageRes.total,
        loading: false,
      })),
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao carregar parcerias.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.state.update(s => ({ ...s, loading: false, error: msg }));
        this.notify.error(msg);
      },
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setSearch(search: string): void {
    this.state.update(s => ({
      ...s,
      filters:    { ...s.filters, search },
      pagination: { ...s.pagination, page: 1 },
    }));
    this.load();
  }

  setStatus(status: PartnershipStatus | ''): void {
    this.state.update(s => ({
      ...s,
      filters:    { ...s.filters, status },
      pagination: { ...s.pagination, page: 1 },
    }));
    this.load();
  }

  // ── Sort / Pagination ───────────────────────────────────────────────────────

  setSort(column: keyof PartnershipRow): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
    this.load();
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
    this.load();
  }

  // ── Selection / Expand ──────────────────────────────────────────────────────

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleExpand(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.expandedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, expandedIds: newSet };
    });
  }

  toggleAllPage(items: PartnershipRow[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Delete / Export ─────────────────────────────────────────────────────────

  delete(id: number, onSuccess?: () => void): void {
    this.svc.delete(id).subscribe({
      next: () => {
        this.load();
        this.notify.success('Parceria excluída com sucesso.');
        onSuccess?.();
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao excluir parceria.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }

  exportExcel(): void {
    this.svc.exportExcel().subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'repasses-parcerias.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao exportar planilha.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }

  // ── Mapper ──────────────────────────────────────────────────────────────────

  private toRow(p: PartnershipListItem): PartnershipRow {
    return {
      id:            p.id,
      displayId:     String(p.id),
      client:        p.client       ?? '—',
      contractName:  p.contractName ?? '—',
      contractCode:  p.contractCode ?? '—',
      description:   p.description  ?? '—',
      approvedValue: formatBRL(p.approvedValue),
      receivedValue: '—',
      balance:       '—',
      status:        p.status ?? '',
    };
  }
}
