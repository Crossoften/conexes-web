// src/app/features/financial-transfers/financial-transfers.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { FinancialTransfer, TransferStatus, TransferType, TransferView } from './financial-transfers.model';
import { FinancialTransfersService } from './financial-transfers.service';

interface State {
  items: FinancialTransfer[];
  loading: boolean;
  error: string | null;
  filters: { view: TransferView; search: string; status: TransferStatus | ''; type: TransferType | '' };
  sort: { column: keyof FinancialTransfer | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class FinancialTransfersStore {
  private readonly svc = inject(FinancialTransfersService);

  private readonly state = signal<State>({
    items: [],
    loading: false,
    error: null,
    filters: { view: 'TRANSFERS', search: '', status: '', type: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  load(): void {
    const view = this.state().filters.view;
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll(view).subscribe({
      next: items => this.state.update(s => ({ ...s, items, loading: false })),
      error: () => this.state.update(s => ({ ...s, items: [], loading: false, error: 'Não foi possível carregar os lançamentos.' })),
    });
  }

  // Selectors
  readonly loading = computed(() => this.state().loading);
  readonly error   = computed(() => this.state().error);
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
        item.description.toLowerCase().includes(term) || 
        item.code.includes(term) ||
        item.origin.toLowerCase().includes(term)
      );
    }
    if (f.status) { result = result.filter(item => item.status === f.status); }
    if (f.type) { result = result.filter(item => item.type === f.type); }
    
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
  setView(view: TransferView) { this.state.update(s => ({ ...s, filters: { ...s.filters, view }, pagination: { ...s.pagination, page: 1 } })); this.load(); }
  setSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } })); }
  setStatus(status: TransferStatus | '') { this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } })); }
  setType(type: TransferType | '') { this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } })); }

  setSort(column: keyof FinancialTransfer) {
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

  toggleAllPage(items: FinancialTransfer[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}