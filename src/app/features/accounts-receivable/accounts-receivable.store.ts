// src/app/features/accounts-receivable/accounts-receivable.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ReceivableAccount, SummaryCard, ReceivableFilters } from './accounts-receivable.model';
import { AccountsReceivableService } from './accounts-receivable.service';
import { NotificationService } from '../../shared/services/notification.service';

interface State {
  items: ReceivableAccount[];
  summaries: SummaryCard[];
  total: number;
  loading: boolean;
  error: string | null;
  view: string;
  filters: ReceivableFilters;
  sort: { column: keyof ReceivableAccount | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
  isFilterModalOpen: boolean;
}

const INITIAL_FILTERS: ReceivableFilters = {
  status: '', dateRange: '', contractor: ''
};

@Injectable()
export class AccountsReceivableStore {
  private readonly svc = inject(AccountsReceivableService);
  private readonly notify = inject(NotificationService);

  private readonly state = signal<State>({
    items: [],
    summaries: [],
    total: 0,
    loading: false,
    error: null,
    view: 'CAPTURA_NF',
    filters: { ...INITIAL_FILTERS },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    isFilterModalOpen: false,
  });

  load(): void {
    const { page, pageSize } = this.state().pagination;
    const filters = this.state().filters;
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll(filters, pageSize, (page - 1) * pageSize).subscribe({
      next: res => this.state.update(s => ({
        ...s, items: res.items, total: res.total,
        summaries: this.svc.buildSummaries(res.raw), loading: false,
      })),
      error: () => this.state.update(s => ({
        ...s, items: [], total: 0, loading: false,
        error: 'Não foi possível carregar as contas a receber.',
      })),
    });
  }

  readonly loading = computed(() => this.state().loading);
  readonly error   = computed(() => this.state().error);
  readonly total   = computed(() => this.state().total);
  readonly summaries = computed(() => this.state().summaries);
  readonly view = computed(() => this.state().view);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly isFilterModalOpen = computed(() => this.state().isFilterModalOpen);

  readonly filteredItems = computed(() => {
    return this.state().items;
  });

  readonly sortedItems = computed(() => {
    const { column, direction } = this.sort();
    const items = this.state().items;
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly filteredTotal = computed(() => this.state().total);

  readonly pageItems = computed(() => this.sortedItems());

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  setView(view: string) { this.state.update(s => ({ ...s, view, pagination: { ...s.pagination, page: 1 } })); }
  
  toggleFilterModal(isOpen: boolean) { this.state.update(s => ({ ...s, isFilterModalOpen: isOpen })); }
  
  applyFilters(newFilters: ReceivableFilters) {
    this.state.update(s => ({ ...s, filters: newFilters, isFilterModalOpen: false, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  clearFilters() {
    this.state.update(s => ({ ...s, filters: { ...INITIAL_FILTERS }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setSort(column: keyof ReceivableAccount) {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); this.load(); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); this.load(); }

  toggleRow(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: ReceivableAccount[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  deleteOne(id: string): void {
    this.svc.delete(Number(id)).subscribe({
      next: () => { this.notify.success('Conta a receber excluída.'); this.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Erro ao excluir a conta a receber.'),
    });
  }
}