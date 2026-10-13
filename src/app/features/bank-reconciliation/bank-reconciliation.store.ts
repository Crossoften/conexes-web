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

/** Intervalo [start, end] (inclusive) a partir do período selecionado. */
function periodRange(period: string, customStart: string, customEnd: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (period) {
    case 'THIS_MONTH': return { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)) };
    case 'LAST_MONTH': return { start: new Date(y, m - 1, 1), end: endOfDay(new Date(y, m, 0)) };
    case 'LAST_90':    return { start: startOfDay(new Date(now.getTime() - 90 * 864e5)), end: endOfDay(now) };
    case 'THIS_YEAR':  return { start: new Date(y, 0, 1), end: endOfDay(new Date(y, 11, 31)) };
    case 'CUSTOM': {
      const s = customStart ? startOfDay(new Date(customStart + 'T00:00:00')) : null;
      const e = customEnd ? endOfDay(new Date(customEnd + 'T00:00:00')) : null;
      return { start: isNaN(s?.getTime() ?? NaN) ? null : s, end: isNaN(e?.getTime() ?? NaN) ? null : e };
    }
    default: return { start: null, end: null }; // '' / ALL = sem filtro
  }
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
  filters: { globalSearch: string; period: string; type: string; itemSearch: string; customStart: string; customEnd: string };
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
    filters: { globalSearch: '', period: '', type: '', itemSearch: '', customStart: '', customEnd: '' },
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
      id: `p-${p.id}`, date: fmtDate(p.date), dayOfWeek: weekday(p.date), rawDate: p.date,
      description: 'Lançamento pendente de conciliação', amount: brl.format(p.value ?? 0),
      bankDetails: accInfo,
    }));
    const movementItems: ReconciliationItem[] = (data.movements ?? []).map(m => ({
      id: `m-${m.id}`, date: fmtDate(m.date), dayOfWeek: weekday(m.date), rawDate: m.date,
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

    // Filtro por período (Este mês, Mês passado, Últimos 90 dias, Este ano, Personalizado).
    const { start, end } = periodRange(f.period, f.customStart, f.customEnd);
    if (start || end) {
      result = result.filter(item => {
        if (!item.rawDate) return false;
        const d = new Date(item.rawDate);
        if (isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
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
  setPeriod(period: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, period }, pagination: { ...s.pagination, page: 1 } })); }
  setCustomStart(d: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, customStart: d }, pagination: { ...s.pagination, page: 1 } })); }
  setCustomEnd(d: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, customEnd: d }, pagination: { ...s.pagination, page: 1 } })); }
  setType(type: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } })); }
  
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