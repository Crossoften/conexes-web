// src/app/features/bank-reconciliation/bank-reconciliation.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ReconciliationItem, ReconciliationTab, BankAccountInfo, ConciliationSummary } from './bank-reconciliation.model';
import { BankReconciliationService, ReconAccount, AccountReconciliation } from './bank-reconciliation.service';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const WEEKDAY = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}
function weekday(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : WEEKDAY[d.getDay()];
}

const EMPTY_ACCOUNT: BankAccountInfo = { bankName: '—', agency: '—', account: '—', balance: 'R$ 0,00' };

interface State {
  accounts: ReconAccount[];
  selectedAccountId: number | null;
  pendingItems: ReconciliationItem[];
  movementItems: ReconciliationItem[];
  accountInfo: BankAccountInfo;
  summaries: ConciliationSummary[];
  loading: boolean;
  error: string | null;
  activeTab: ReconciliationTab;
  filters: { globalSearch: string; period: string; type: string; itemSearch: string };
  pagination: { page: number; pageSize: number };
  expandedIds: Set<string>;
  expandedInnerIds: Set<string>; // Gerencia a expansão das sub-tabelas em Movimentações
}

@Injectable()
export class BankReconciliationStore {
  private readonly svc = inject(BankReconciliationService);

  private readonly state = signal<State>({
    accounts: [],
    selectedAccountId: null,
    pendingItems: [],
    movementItems: [],
    accountInfo: EMPTY_ACCOUNT,
    summaries: [],
    loading: false,
    error: null,
    activeTab: 'PENDING',
    filters: { globalSearch: '', period: '', type: '', itemSearch: '' },
    pagination: { page: 1, pageSize: 10 },
    expandedIds: new Set(),
    expandedInnerIds: new Set(),
  });

  // Carrega as contas e a conciliação da primeira conta (ou vazio se não houver conta).
  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAccounts().subscribe({
      next: accounts => {
        this.state.update(s => ({ ...s, accounts }));
        if (!accounts.length) {
          this.state.update(s => ({ ...s, loading: false, accountInfo: EMPTY_ACCOUNT, summaries: [], pendingItems: [], movementItems: [] }));
          return;
        }
        this.selectAccount(accounts[0].id);
      },
      error: () => this.state.update(s => ({ ...s, loading: false, error: 'Não foi possível carregar a conciliação.' })),
    });
  }

  selectAccount(bankAccountId: number): void {
    this.state.update(s => ({ ...s, loading: true, selectedAccountId: bankAccountId, expandedIds: new Set(), expandedInnerIds: new Set() }));
    this.svc.getAccountReconciliation(bankAccountId).subscribe({
      next: data => this.state.update(s => ({ ...s, ...this.mapReconciliation(data), loading: false })),
      error: () => this.state.update(s => ({ ...s, loading: false, error: 'Não foi possível carregar a conta.' })),
    });
  }

  private mapReconciliation(data: AccountReconciliation): Partial<State> {
    const accInfo: BankAccountInfo = {
      bankName: data.account.name, agency: `Ag. ${data.account.agency}`,
      account: `C/C ${data.account.account}`, balance: brl.format(data.account.balance ?? 0),
    };
    const pendingItems: ReconciliationItem[] = (data.pendingReconciliations ?? []).map(p => ({
      id: `p-${p.id}`, date: fmtDate(p.date), dayOfWeek: weekday(p.date),
      description: 'Lançamento pendente de conciliação', amount: brl.format(p.value ?? 0),
      bankDetails: accInfo,
    }));
    const movementItems: ReconciliationItem[] = (data.movements ?? []).map(m => ({
      id: `m-${m.id}`, date: fmtDate(m.date), dayOfWeek: weekday(m.date),
      description: m.bankDescription ?? '—', amount: brl.format(m.bankValue ?? 0),
      movementGroups: [{
        id: `g-${m.id}`,
        groupName: m.reconciled ? 'Conciliado' : 'Pendente',
        totalValConexes: m.conexosValue != null ? brl.format(m.conexosValue) : '—',
        groupDescBank: m.bankDescription ?? '—',
        totalValBank: brl.format(m.bankValue ?? 0),
        conciliationType: m.reconciled ? 'Manual/Automática' : 'Não conciliado',
        subItems: [{
          id: `s-${m.id}`,
          descConexes: m.conexosDescription ?? (m.stakeholder ?? '—'),
          valConexes: m.conexosValue != null ? brl.format(m.conexosValue) : '—',
          descBank: m.bankDescription ?? '—',
          valBank: brl.format(m.bankValue ?? 0),
        }],
      }],
    }));
    const totalConc = (data.movements ?? []).filter(m => m.reconciled).reduce((a, m) => a + (m.bankValue ?? 0), 0);
    const totalPend = (data.pendingReconciliations ?? []).reduce((a, p) => a + (p.value ?? 0), 0);
    const summaries: ConciliationSummary[] = [
      { title: 'Conciliado', credit: brl.format(totalConc), debit: '' },
      { title: 'Pendente', credit: brl.format(totalPend), debit: '' },
    ];
    return { accountInfo: accInfo, summaries, pendingItems, movementItems };
  }

  readonly accounts = computed(() => this.state().accounts);
  readonly selectedAccountId = computed(() => this.state().selectedAccountId);
  readonly error = computed(() => this.state().error);
  readonly loading = computed(() => this.state().loading);
  readonly activeTab = computed(() => this.state().activeTab);
  readonly accountInfo = computed(() => this.state().accountInfo);
  readonly summaries = computed(() => this.state().summaries);
  readonly filters = computed(() => this.state().filters);
  readonly pagination = computed(() => this.state().pagination);
  readonly expandedIds = computed(() => this.state().expandedIds);
  readonly expandedInnerIds = computed(() => this.state().expandedInnerIds);

  readonly filteredItems = computed(() => {
    let result = this.state().activeTab === 'PENDING' ? this.state().pendingItems : this.state().movementItems;
    const f = this.filters();

    if (f.itemSearch) {
      const term = f.itemSearch.toLowerCase();
      result = result.filter(item =>
        item.date.includes(term) ||
        item.dayOfWeek.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term));
    }
    return result;
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredItems().slice(start, start + pageSize);
  });

  setTab(tab: ReconciliationTab) {
    this.state.update(s => ({ 
      ...s, activeTab: tab, expandedIds: new Set(), expandedInnerIds: new Set(), pagination: { ...s.pagination, page: 1 } 
    }));
  }

  setGlobalSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, globalSearch: search } })); }
  setPeriod(period: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, period } })); }
  setType(type: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, type } })); }
  
  setItemSearch(search: string) { 
    this.state.update(s => ({ ...s, filters: { ...s.filters, itemSearch: search }, pagination: { ...s.pagination, page: 1 } })); 
  }

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); }

  toggleExpand(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.expandedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, expandedIds: newSet };
    });
  }

  toggleInnerExpand(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.expandedInnerIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, expandedInnerIds: newSet };
    });
  }
}