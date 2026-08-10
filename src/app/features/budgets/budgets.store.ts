// src/app/features/budgets/budgets.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { Budget, BudgetStatus, BudgetTab } from './budgets.model';
import { BUDGETS_MOCK } from './budgets.mock';

interface State {
  items: Budget[];
  loading: boolean;
  activeTab: BudgetTab;
  filters: { search: string; period: string };
  sort: { column: keyof Budget | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class BudgetsStore {
  private readonly state = signal<State>({
    items: BUDGETS_MOCK,
    loading: false,
    activeTab: 'BUDGETS',
    filters: { search: '', period: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // Selectors
  readonly loading = computed(() => this.state().loading);
  readonly activeTab = computed(() => this.state().activeTab);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f = this.filters();
    
    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item => 
        item.displayId.toLowerCase().includes(term) || 
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    }
    if (f.period) {
      // Exemplo genérico: na prática você filtraria pelas datas corretas
      result = result.filter(item => item.periodicity === f.period || f.period !== '');
    }
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
  setTab(tab: BudgetTab) {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set(), pagination: { ...s.pagination, page: 1 } }));
  }

  setSearch(search: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setPeriod(period: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, period }, pagination: { ...s.pagination, page: 1 } }));
  }

  setSort(column: keyof Budget) {
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

  toggleAllPage(items: Budget[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}