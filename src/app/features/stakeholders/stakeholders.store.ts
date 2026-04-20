// src/app/features/stakeholders/stakeholders.store.ts
import { Injectable, computed, signal } from '@angular/core';

export interface Stakeholder {
  id: string;
  code: string;
  personType: string; // PF ou PJ
  document: string; // CNPJ/CPF
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface State {
  items: Stakeholder[];
  filters: { search: string; status: string; type: string };
  sort: { column: string; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class StakeholdersStore {
  // Mock inicial
  private readonly state = signal<State>({
    items: Array.from({ length: 25 }, (_, i) => ({
      id: `stk-${i + 1}`,
      code: '00000000',
      personType: i === 0 ? 'PF' : 'PJ',
      document: '00000000-00',
      name: 'M FARIA CIA LTDA (MATRIZ E FILIAIS)',
      status: i >= 5 ? 'INACTIVE' : 'ACTIVE',
    })),
    filters: { search: '', status: '', type: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // Selectors
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f = this.filters();
    if (f.search) result = result.filter(i => i.name.toLowerCase().includes(f.search.toLowerCase()));
    if (f.status) result = result.filter(i => i.status === f.status);
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
    return items.length > 0 && items.every((item: any) => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some((item: any) => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // Updaters
  setSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } })); }
  setStatus(status: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } })); }
  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); }
  setSort(column: string) {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }
  toggleRow(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }
  toggleAllPage(items: any[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}