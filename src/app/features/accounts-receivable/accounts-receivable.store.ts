// src/app/features/accounts-receivable/accounts-receivable.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { ReceivableAccount, SummaryCard, ReceivableFilters } from './accounts-receivable.model';
import { ACCOUNTS_RECEIVABLE_MOCK, RECEIVABLE_SUMMARIES_MOCK } from './accounts-receivable.mock';

interface State {
  items: ReceivableAccount[];
  summaries: SummaryCard[];
  loading: boolean;
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
  private readonly state = signal<State>({
    items: ACCOUNTS_RECEIVABLE_MOCK,
    summaries: RECEIVABLE_SUMMARIES_MOCK,
    loading: false,
    view: 'CAPTURA_NF',
    filters: { ...INITIAL_FILTERS },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    isFilterModalOpen: false,
  });

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
    // Lógica de filtro avançado entraria aqui
    return result;
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredItems().slice(start, start + pageSize);
  });

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
  }

  clearFilters() {
    this.state.update(s => ({ ...s, filters: { ...INITIAL_FILTERS } }));
  }

  setSort(column: keyof ReceivableAccount) {
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

  toggleAllPage(items: ReceivableAccount[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}