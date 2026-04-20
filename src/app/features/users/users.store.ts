// src/app/features/users/users.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { User, UserStatus } from './users.model';
import { USERS_MOCK } from './users.mock';

type TabType = 'users' | 'permissions';

interface State {
  items: User[];
  loading: boolean;
  activeTab: TabType;
  filters: { search: string; status: UserStatus | '' };
  sort: { column: keyof User | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class UsersStore {
  private readonly state = signal<State>({
    items: USERS_MOCK,
    loading: false,
    activeTab: 'users',
    filters: { search: '', status: '' },
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
        item.name.toLowerCase().includes(term) || 
        item.email.toLowerCase().includes(term) ||
        item.company.toLowerCase().includes(term)
      );
    }
    if (f.status) {
      result = result.filter(item => item.status === f.status);
    }
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
  setTab(tab: TabType) {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set(), pagination: { ...s.pagination, page: 1 } }));
  }

  setSearch(search: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setStatus(status: UserStatus | '') {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
  }

  setSort(column: keyof User) {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number) {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
  }

  setPageSize(pageSize: number) {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
  }

  toggleRow(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: User[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}