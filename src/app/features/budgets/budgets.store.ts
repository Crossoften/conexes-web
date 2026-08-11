// src/app/features/budgets/budgets.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { Budget, BudgetStatus, BudgetTab } from './budgets.model';
import { BudgetsService } from './budgets.service';

interface State {
  items: Budget[];
  total: number;
  loading: boolean;
  error: string | null;
  activeTab: BudgetTab;
  filters: { search: string; period: string };
  sort: { column: keyof Budget | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class BudgetsStore {
  private readonly svc = inject(BudgetsService);

  private readonly state = signal<State>({
    items: [],
    total: 0,
    loading: false,
    error: null,
    activeTab: 'BUDGETS',
    filters: { search: '', period: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  load(): void {
    const { page, pageSize } = this.state().pagination;
    const search = this.state().filters.search;
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll(search, pageSize, (page - 1) * pageSize).subscribe({
      next: res => this.state.update(s => ({ ...s, items: res.items, total: res.total, loading: false })),
      error: () => this.state.update(s => ({ ...s, items: [], total: 0, loading: false, error: 'Não foi possível carregar os orçamentos.' })),
    });
  }

  // Selectors
  readonly loading = computed(() => this.state().loading);
  readonly error   = computed(() => this.state().error);
  readonly total   = computed(() => this.state().total);
  readonly activeTab = computed(() => this.state().activeTab);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly filteredItems = computed(() => {
    // Busca e paginação são feitas no back (query params).
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

  // Updaters
  setTab(tab: BudgetTab) {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set(), pagination: { ...s.pagination, page: 1 } }));
  }

  setSearch(search: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
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

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); this.load(); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); this.load(); }

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