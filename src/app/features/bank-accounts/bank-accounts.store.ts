// src/app/features/bank-accounts/bank-accounts.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { BankAccount, Bank, BankAccountTab, BankPayload, BankAccountPayload } from './bank-accounts.model';
import { BankAccountsService } from './bank-accounts.service';

interface State {
  accounts:    BankAccount[];
  banks:       Bank[];
  loading:     boolean;
  error:       string | null;
  activeTab:   BankAccountTab;
  filters:     { search: string; type: string; status: string };
  sort:        { column: string; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<string>;

  // Modal de detalhe/edição de conta bancária
  accountDetailModal: {
    open:     boolean;
    mode:     'view' | 'edit';
    loading:  boolean;
    saving:   boolean;
    error:    string | null;
    account:  BankAccount | null;
  };

  // Modal de exclusão de conta bancária
  accountDeleteModal: {
    open:    boolean;
    deleting: boolean;
    account: BankAccount | null;
  };

  // Modal de criação/edição de banco
  bankModal: {
    open:     boolean;
    mode:     'create' | 'edit' | 'view';
    saving:   boolean;
    deleting: boolean;
    error:    string | null;
    bank:     Bank | null;
  };

  // Modal de exclusão de banco
  deleteModal: {
    open: boolean;
    bank: Bank | null;
  };
}

@Injectable()
export class BankAccountsStore {
  private svc = inject(BankAccountsService);

  private readonly state = signal<State>({
    accounts:    [],
    banks:       [],
    loading:     false,
    error:       null,
    activeTab:   'ACCOUNTS',
    filters:     { search: '', type: '', status: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),

    accountDetailModal: {
      open:    false,
      mode:    'view',
      loading: false,
      saving:  false,
      error:   null,
      account: null,
    },

    accountDeleteModal: {
      open:     false,
      deleting: false,
      account:  null,
    },

    bankModal: {
      open:     false,
      mode:     'create',
      saving:   false,
      deleting: false,
      error:    null,
      bank:     null,
    },

    deleteModal: {
      open: false,
      bank: null,
    },
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading             = computed(() => this.state().loading);
  readonly error               = computed(() => this.state().error);
  readonly activeTab           = computed(() => this.state().activeTab);
  readonly filters             = computed(() => this.state().filters);
  readonly sort                = computed(() => this.state().sort);
  readonly pagination          = computed(() => this.state().pagination);
  readonly selectedIds         = computed(() => this.state().selectedIds);
  readonly bankModal           = computed(() => this.state().bankModal);
  readonly deleteModal         = computed(() => this.state().deleteModal);
  readonly accountDetailModal  = computed(() => this.state().accountDetailModal);
  readonly accountDeleteModal  = computed(() => this.state().accountDeleteModal);
  readonly allBanks            = computed(() => this.state().banks);

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
          ? (item.nickname?.toLowerCase().includes(term)
              || item.bankName?.toLowerCase().includes(term)
              || item.account?.includes(f.search))
          : (item.name?.toLowerCase().includes(term)    || item.code?.includes(f.search))
      );
    }

    if (f.type) {
      result = result.filter(item =>
        tab === 'ACCOUNTS' ? item.accountType === f.type : item.type === f.type
      );
    }

    // Status só existe nas contas.
    if (f.status && tab === 'ACCOUNTS') {
      result = result.filter(item => item.status === f.status);
    }

    return result;
  });

  readonly sortedListItems = computed(() => {
    const { column, direction } = this.sort();
    const items = this.filteredListItems();
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly filteredTotal = computed(() => this.filteredListItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    return this.sortedListItems().slice((page - 1) * pageSize, page * pageSize);
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

  // ── Load ──────────────────────────────────────────────────────────────────

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    let accountsDone = false;
    let banksDone    = false;
    let accounts: BankAccount[] = [];
    let banks: Bank[]           = [];

    const tryFinish = () => {
      if (accountsDone && banksDone) {
        this.state.update(s => ({ ...s, accounts, banks, loading: false }));
      }
    };

    this.svc.getAll().subscribe({
      next: res => {
        accounts     = Array.isArray(res) ? (res as BankAccount[]) : ((res as any).accounts ?? []);
        accountsDone = true;
        tryFinish();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar contas bancárias.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
      },
    });

    this.svc.getAllBanks().subscribe({
      next: res => {
        banks     = res;
        banksDone = true;
        tryFinish();
      },
      error: () => {
        banksDone = true;
        tryFinish();
      },
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setTab(tab: BankAccountTab): void {
    this.state.update(s => ({
      ...s,
      activeTab:   tab,
      selectedIds: new Set(),
      filters:     { search: '', type: '', status: '' },
      pagination:  { ...s.pagination, page: 1 },
    }));
  }

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setType(type: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
  }

  setStatus(status: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
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
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(String(item.id)));
      items.forEach(item =>
        allSelected ? newSet.delete(String(item.id)) : newSet.add(String(item.id))
      );
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Account Detail Modal ──────────────────────────────────────────────────

  openViewAccount(account: BankAccount): void {
    this.state.update(s => ({
      ...s,
      accountDetailModal: { open: true, mode: 'view', loading: false, saving: false, error: null, account },
    }));
    this.hydrateAccount(account.id);
  }

  openEditAccount(account: BankAccount): void {
    this.state.update(s => ({
      ...s,
      accountDetailModal: { open: true, mode: 'edit', loading: false, saving: false, error: null, account },
    }));
    this.hydrateAccount(account.id);
  }

  /** Busca o detalhe completo da conta (a listagem pode vir enxuta) e atualiza o modal. */
  private hydrateAccount(id: number): void {
    this.svc.getById(id).subscribe({
      next: full => this.state.update(s =>
        s.accountDetailModal.open && s.accountDetailModal.account?.id === id
          ? { ...s, accountDetailModal: { ...s.accountDetailModal, account: full } }
          : s),
      error: () => { /* mantém os dados da lista */ },
    });
  }

  switchAccountModalToEdit(): void {
    this.state.update(s => ({
      ...s,
      accountDetailModal: { ...s.accountDetailModal, mode: 'edit' },
    }));
  }

  closeAccountDetailModal(): void {
    this.state.update(s => ({
      ...s,
      accountDetailModal: { ...s.accountDetailModal, open: false },
    }));
  }

  saveAccount(payload: BankAccountPayload): void {
    const modal = this.state().accountDetailModal;
    if (!modal.account) return;

    this.state.update(s => ({ ...s, accountDetailModal: { ...s.accountDetailModal, saving: true, error: null } }));

    this.svc.update(modal.account.id, payload).subscribe({
      next: () => {
        this.svc.getAll().subscribe({
          next: res => {
            const accounts = Array.isArray(res) ? (res as BankAccount[]) : ((res as any).accounts ?? []);
            this.state.update(s => ({
              ...s,
              accounts,
              accountDetailModal: { ...s.accountDetailModal, open: false, saving: false },
            }));
          },
          error: () => {
            this.state.update(s => ({
              ...s,
              accountDetailModal: { ...s.accountDetailModal, open: false, saving: false },
            }));
          },
        });
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao salvar conta bancária.';
        this.state.update(s => ({ ...s, accountDetailModal: { ...s.accountDetailModal, saving: false, error: msg } }));
      },
    });
  }

  // ── Account Delete Modal ──────────────────────────────────────────────────

  openDeleteAccount(account: BankAccount): void {
    this.state.update(s => ({
      ...s,
      accountDeleteModal: { open: true, deleting: false, account },
    }));
  }

  closeAccountDeleteModal(): void {
    this.state.update(s => ({
      ...s,
      accountDeleteModal: { ...s.accountDeleteModal, open: false },
    }));
  }

  confirmDeleteAccount(): void {
    const account = this.state().accountDeleteModal.account;
    if (!account) return;

    this.state.update(s => ({ ...s, accountDeleteModal: { ...s.accountDeleteModal, deleting: true } }));

    this.svc.delete(account.id).subscribe({
      next: () => {
        this.state.update(s => ({
          ...s,
          accounts: s.accounts.filter(a => a.id !== account.id),
          accountDeleteModal: { open: false, deleting: false, account: null },
          accountDetailModal: { ...s.accountDetailModal, open: false },
        }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir conta bancária.';
        this.state.update(s => ({
          ...s,
          accountDeleteModal: { ...s.accountDeleteModal, deleting: false },
          accountDetailModal: { ...s.accountDetailModal, error: msg },
        }));
      },
    });
  }

  // ── Bank Modal ────────────────────────────────────────────────────────────

  openCreateBank(): void {
    this.state.update(s => ({
      ...s,
      bankModal: { open: true, mode: 'create', saving: false, deleting: false, error: null, bank: null },
    }));
  }

  openEditBank(bank: Bank): void {
    this.state.update(s => ({
      ...s,
      bankModal: { open: true, mode: 'edit', saving: false, deleting: false, error: null, bank },
    }));
  }

  openViewBank(bank: Bank): void {
    this.state.update(s => ({
      ...s,
      bankModal: { open: true, mode: 'view', saving: false, deleting: false, error: null, bank },
    }));
  }

  closeBankModal(): void {
    this.state.update(s => ({
      ...s,
      bankModal: { ...s.bankModal, open: false },
    }));
  }

  saveBank(payload: BankPayload): void {
    const modal = this.state().bankModal;
    this.state.update(s => ({ ...s, bankModal: { ...s.bankModal, saving: true, error: null } }));

    const request$ = modal.mode === 'edit' && modal.bank
      ? this.svc.updateBank(modal.bank.id, payload)
      : this.svc.createBank(payload);

    request$.subscribe({
      next: () => {
        this.svc.getAllBanks().subscribe({
          next: banks => {
            this.state.update(s => ({
              ...s, banks,
              bankModal: { ...s.bankModal, open: false, saving: false },
            }));
          },
          error: () => {
            this.state.update(s => ({
              ...s,
              bankModal: { ...s.bankModal, open: false, saving: false },
            }));
          },
        });
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao salvar banco.';
        this.state.update(s => ({ ...s, bankModal: { ...s.bankModal, saving: false, error: msg } }));
      },
    });
  }

  // ── Bank Delete Modal ─────────────────────────────────────────────────────

  openDeleteBank(bank: Bank): void {
    this.state.update(s => ({ ...s, deleteModal: { open: true, bank } }));
  }

  closeDeleteModal(): void {
    this.state.update(s => ({ ...s, deleteModal: { open: false, bank: null } }));
  }

  confirmDeleteBank(): void {
    const bank = this.state().deleteModal.bank;
    if (!bank) return;

    this.state.update(s => ({ ...s, bankModal: { ...s.bankModal, deleting: true } }));

    this.svc.deleteBank(bank.id).subscribe({
      next: () => {
        this.svc.getAllBanks().subscribe({
          next: banks => {
            this.state.update(s => ({
              ...s, banks,
              deleteModal: { open: false, bank: null },
              bankModal: { ...s.bankModal, deleting: false },
            }));
          },
          error: () => {
            this.state.update(s => ({
              ...s,
              deleteModal: { open: false, bank: null },
              bankModal: { ...s.bankModal, deleting: false },
            }));
          },
        });
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir banco.';
        this.state.update(s => ({
          ...s,
          bankModal: { ...s.bankModal, deleting: false, error: msg },
          deleteModal: { open: false, bank: null },
        }));
      },
    });
  }
}
