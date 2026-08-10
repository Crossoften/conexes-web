// src/app/features/accounts-payable/accounts-payable.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { PayableAccount, SummaryCard, AdvancedFilters } from './accounts-payable.model';
import { ACCOUNTS_PAYABLE_MOCK, PAYABLE_SUMMARIES_MOCK } from './accounts-payable.mock';

interface State {
  items: PayableAccount[];
  summaries: SummaryCard[];
  loading: boolean;
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
  private readonly state = signal<State>({
    items: ACCOUNTS_PAYABLE_MOCK,
    summaries: PAYABLE_SUMMARIES_MOCK,
    loading: false,
    view: 'LANÇAMENTOS',
    filters: { ...INITIAL_FILTERS },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    isFilterModalOpen: false,
  });

  // Selectors
  readonly loading = computed(() => this.state().loading);
  readonly summaries = computed(() => this.state().summaries);
  readonly view = computed(() => this.state().view);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly isFilterModalOpen = computed(() => this.state().isFilterModalOpen);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    // Aqui seria implementada a lógica de filtro baseado no state().filters
    return result;
  });

  readonly sortedItems = computed(() => {
    const { column, direction } = this.sort();
    const items = this.filteredItems();
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.sortedItems().slice(start, start + pageSize);
  });

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
  }

  clearFilters() {
    this.state.update(s => ({ ...s, filters: { ...INITIAL_FILTERS } }));
  }

  setSort(column: keyof PayableAccount) {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); }

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