// src/app/features/bank-accounts/bank-accounts.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { BankAccount, Bank, BankAccountStatus, BankAccountTab } from './bank-accounts.model';
import { BankAccountsService } from './bank-accounts.service';

interface State {
  accounts:   BankAccount[];
  banks:      Bank[];
  loading:    boolean;
  error:      string | null;
  activeTab:  BankAccountTab;
  filters:    { search: string; status: BankAccountStatus | ''; type: string };
  sort:       { column: string; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class BankAccountsStore {
  private svc = inject(BankAccountsService);

  private readonly state = signal<State>({
    accounts:   [],
    banks:      [],
    loading:    false,
    error:      null,
    activeTab:  'ACCOUNTS',
    filters:    { search: '', status: '', type: '' },
    sort:       { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly activeTab   = computed(() => this.state().activeTab);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly currentListItems = computed(() =>
    this.activeTab() === 'ACCOUNTS' ? this.state().accounts : this.state().banks
  );

  readonly filteredListItems = computed(() => {
    let result = this.currentListItems() as any[];
    const tab  = this.activeTab();
    const f    = this.filters();

    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item =>
        tab === 'ACCOUNTS'
          ? (item.nickname?.toLowerCase().includes(term) || item.code?.includes(f.search))
          : (item.name?.toLowerCase().includes(term)    || item.code?.includes(f.search))
      );
    }

    if (f.status) result = result.filter(item => item.status === f.status);

    if (f.type) {
      result = result.filter(item =>
        tab === 'ACCOUNTS' ? item.accountType === f.type : item.type === f.type
      );
    }

    return result;
  });

  readonly filteredTotal = computed(() => this.filteredListItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    return this.filteredListItems().slice((page - 1) * pageSize, page * pageSize);
  });

  readonly pageAccounts = computed(() =>
    this.activeTab() === 'ACCOUNTS' ? (this.pageItems() as BankAccount[]) : []
  );

  readonly pageBanks = computed(() =>
    this.activeTab() === 'BANKS' ? (this.pageItems() as Bank[]) : []
  );

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every((item: any) => this.selectedIds().has(String(item.id)));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some((item: any) => this.selectedIds().has(String(item.id))) && !this.allPageSelected();
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.svc.getAll().subscribe({
      next: res => {
        // Suporte a resposta { accounts, banks } ou array simples de contas
        const accounts = Array.isArray(res)
          ? (res as BankAccount[])
          : ((res as any).accounts ?? []);
        const banks = Array.isArray(res)
          ? []
          : ((res as any).banks ?? []);

        this.state.update(s => ({ ...s, accounts, banks, loading: false }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar contas bancárias.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
      },
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setTab(tab: BankAccountTab): void {
    this.state.update(s => ({
      ...s,
      activeTab:   tab,
      selectedIds: new Set(),
      filters:     { search: '', status: '', type: '' },
      pagination:  { ...s.pagination, page: 1 },
    }));
  }

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setStatus(status: BankAccountStatus | ''): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
  }

  setType(type: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  setSort(column: string): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleRow(id: string): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: any[]): void {
    this.state.update(s => {
      const newSet     = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(String(item.id)));
      items.forEach(item =>
        allSelected ? newSet.delete(String(item.id)) : newSet.add(String(item.id))
      );
      return { ...s, selectedIds: newSet };
    });
  }
}
