// src/app/features/purchasing-management/purchasing-management.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { PurchasingReq, ReqStatus } from './purchasing-management.model';
import { PURCHASING_MOCK } from './purchasing-management.mock';

interface State {
  items: PurchasingReq[];
  loading: boolean;
  filters: { search: string; stage: string; type: string; period: string; status: ReqStatus | '' };
  sort: { column: keyof PurchasingReq | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class PurchasingManagementStore {
  private readonly state = signal<State>({
    items: PURCHASING_MOCK,
    loading: false,
    filters: { search: '', stage: '', type: '', period: '', status: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // Selectors
  readonly loading = computed(() => this.state().loading);
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
        item.title.toLowerCase().includes(term) || 
        item.requester.toLowerCase().includes(term) ||
        item.typeId.includes(term)
      );
    }
    if (f.status) { result = result.filter(item => item.status === f.status); }
    if (f.stage) { result = result.filter(item => item.stage === f.stage); }
    if (f.type) { result = result.filter(item => item.title === f.type); } // Adapte a lógica do filtro
    
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

  // Updaters
  setSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } })); }
  setStatus(status: ReqStatus | '') { this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } })); }
  setStage(stage: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, stage }, pagination: { ...s.pagination, page: 1 } })); }
  setType(type: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } })); }
  setPeriod(period: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, period }, pagination: { ...s.pagination, page: 1 } })); }

  setSort(column: keyof PurchasingReq) {
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

  toggleAllPage(items: PurchasingReq[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}