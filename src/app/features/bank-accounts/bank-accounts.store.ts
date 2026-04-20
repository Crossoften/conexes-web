// src/app/features/bank-accounts/bank-accounts.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { BankAccount, Bank, BankAccountStatus, BankAccountTab } from './bank-accounts.model';
import { BANK_ACCOUNTS_MOCK, BANKS_MOCK } from './bank-accounts.mock';

interface State {
  accounts: BankAccount[];
  banks: Bank[];
  loading: boolean;
  activeTab: BankAccountTab;
  filters: { search: string; status: BankAccountStatus | ''; type: string };
  sort: { column: string; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class BankAccountsStore {
  private readonly state = signal<State>({
    accounts: BANK_ACCOUNTS_MOCK,
    banks: BANKS_MOCK,
    loading: false,
    activeTab: 'ACCOUNTS',
    filters: { search: '', status: '', type: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // Selectors globais
  readonly loading = computed(() => this.state().loading);
  readonly activeTab = computed(() => this.state().activeTab);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  // Lista atual baseada na aba
  readonly currentListItems = computed(() => {
    return this.activeTab() === 'ACCOUNTS' ? this.state().accounts : this.state().banks;
  });

  readonly filteredListItems = computed(() => {
    let result = this.currentListItems() as any[];
    const tab = this.activeTab();
    const f = this.filters();
    
    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item => {
        if (tab === 'ACCOUNTS') {
          return item.alias.toLowerCase().includes(term) || item.code.includes(term);
        } else {
          return item.name.toLowerCase().includes(term) || item.code.includes(term);
        }
      });
    }
    
    if (f.status) { result = result.filter(item => item.status === f.status); }
    
    if (f.type) {
      result = result.filter(item => {
        if (tab === 'ACCOUNTS') return item.accountType === f.type;
        return item.type === f.type;
      });
    }
    
    return result;
  });

  readonly filteredTotal = computed(() => this.filteredListItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredListItems().slice(start, start + pageSize);
  });

  // Selectors tipados para o HTML não reclamar em strict mode
  readonly pageAccounts = computed(() => this.activeTab() === 'ACCOUNTS' ? this.pageItems() as BankAccount[] : []);
  readonly pageBanks = computed(() => this.activeTab() === 'BANKS' ? this.pageItems() as Bank[] : []);

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every((item: any) => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some((item: any) => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // Updaters
  setTab(tab: BankAccountTab) {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set(), filters: { search: '', status: '', type: '' }, pagination: { ...s.pagination, page: 1 } }));
  }

  setSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } })); }
  setStatus(status: BankAccountStatus | '') { this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } })); }
  setType(type: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } })); }

  setSort(column: string) {
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

  toggleAllPage(items: any[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}