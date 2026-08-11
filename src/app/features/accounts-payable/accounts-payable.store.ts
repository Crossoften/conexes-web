// src/app/features/accounts-payable/accounts-payable.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { PayableAccount, SummaryCard, AdvancedFilters } from './accounts-payable.model';
import { AccountsPayableService } from './accounts-payable.service';

interface State {
  items: PayableAccount[];
  summaries: SummaryCard[];
  total: number;
  loading: boolean;
  error: string | null;
  view: string;
  filters: AdvancedFilters;
  sort: { column: keyof PayableAccount | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
  isFilterModalOpen: boolean;
}

const INITIAL_FILTERS: AdvancedFilters = {
  issue: '', status: '', dateRange: '', supplier: '', remittanceStatus: '', expenseType: '',
  paymentType: '', contract: '', requisition: '', writeOffAccount: '', payingAccount: '',
  categoryAccount: '', costCenter: '', subProject: ''
};

@Injectable()
export class AccountsPayableStore {
  private readonly svc = inject(AccountsPayableService);

  private readonly state = signal<State>({
    items: [],
    summaries: [],
    total: 0,
    loading: false,
    error: null,
    view: 'LANÇAMENTOS',
    filters: { ...INITIAL_FILTERS },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    isFilterModalOpen: false,
  });

  // Carrega a página atual do back (base limpa => lista vazia, sem mock).
  load(): void {
    const { page, pageSize } = this.state().pagination;
    const filters = this.state().filters;
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll(filters, pageSize, (page - 1) * pageSize).subscribe({
      next: res => this.state.update(s => ({
        ...s,
        items: res.items,
        total: res.total,
        summaries: this.svc.buildSummaries(res.items, []),
        loading: false,
      })),
      error: () => this.state.update(s => ({
        ...s, items: [], total: 0, loading: false,
        error: 'Não foi possível carregar as contas a pagar.',
      })),
    });
  }

  // Selectors
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

  // A filtragem e a paginação são feitas no BACK (query params). O front só ordena
  // visualmente a página já carregada.
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

  // Total do servidor (não o tamanho da página carregada).
  readonly filteredTotal = computed(() => this.state().total);

  // O back já devolve apenas a página pedida.
  readonly pageItems = computed(() => this.sortedItems());

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // Updaters
  setView(view: string) { this.state.update(s => ({ ...s, view, pagination: { ...s.pagination, page: 1 } })); }
  
  toggleFilterModal(isOpen: boolean) { this.state.update(s => ({ ...s, isFilterModalOpen: isOpen })); }
  
  applyFilters(newFilters: AdvancedFilters) {
    this.state.update(s => ({ ...s, filters: newFilters, isFilterModalOpen: false, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  clearFilters() {
    this.state.update(s => ({ ...s, filters: { ...INITIAL_FILTERS }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setSort(column: keyof PayableAccount) {
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

  toggleAllPage(items: PayableAccount[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}