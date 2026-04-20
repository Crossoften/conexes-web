// src/app/features/bank-reconciliation/bank-reconciliation.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { ReconciliationItem, ReconciliationTab, BankAccountInfo, ConciliationSummary } from './bank-reconciliation.model';
import { ACCOUNT_INFO_MOCK, SUMMARY_CARDS_MOCK, RECONCILIATION_ITEMS_MOCK } from './bank-reconciliation.mock';

interface State {
  items: ReconciliationItem[];
  accountInfo: BankAccountInfo;
  summaries: ConciliationSummary[];
  loading: boolean;
  activeTab: ReconciliationTab;
  filters: { globalSearch: string; period: string; type: string; itemSearch: string };
  pagination: { page: number; pageSize: number };
  expandedIds: Set<string>;
  expandedInnerIds: Set<string>; // Gerencia a expansão das sub-tabelas em Movimentações
}

@Injectable()
export class BankReconciliationStore {
  private readonly state = signal<State>({
    items: RECONCILIATION_ITEMS_MOCK,
    accountInfo: ACCOUNT_INFO_MOCK,
    summaries: SUMMARY_CARDS_MOCK,
    loading: false,
    activeTab: 'PENDING',
    filters: { globalSearch: '', period: '', type: '', itemSearch: '' },
    pagination: { page: 1, pageSize: 10 },
    expandedIds: new Set(),
    expandedInnerIds: new Set(),
  });

  readonly loading = computed(() => this.state().loading);
  readonly activeTab = computed(() => this.state().activeTab);
  readonly accountInfo = computed(() => this.state().accountInfo);
  readonly summaries = computed(() => this.state().summaries);
  readonly filters = computed(() => this.state().filters);
  readonly pagination = computed(() => this.state().pagination);
  readonly expandedIds = computed(() => this.state().expandedIds);
  readonly expandedInnerIds = computed(() => this.state().expandedInnerIds);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f = this.filters();
    
    if (f.itemSearch) {
      const term = f.itemSearch.toLowerCase();
      result = result.filter(item => item.date.includes(term) || item.dayOfWeek.toLowerCase().includes(term));
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