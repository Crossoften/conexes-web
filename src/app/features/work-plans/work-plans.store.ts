// src/app/features/work-plans/work-plans.store.ts
import { Injectable, computed, signal } from '@angular/core';
import { WorkPlanMetric, Proposal, ActivePlan } from './work-plans.model';
import { WORK_PLANS_METRICS_MOCK, PROPOSALS_MOCK, ACTIVE_PLANS_MOCK } from './work-plans.mock';

type TabType = 'dashboard' | 'proposals' | 'active-plans';

interface State {
  activeTab: TabType;
  metrics: WorkPlanMetric[];
  proposals: Proposal[];
  plans: ActivePlan[];
  filters: { search: string; status: string; instrument: string };
  sort: { column: string; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

@Injectable()
export class WorkPlansStore {
  private readonly state = signal<State>({
    activeTab: 'dashboard',
    metrics: WORK_PLANS_METRICS_MOCK,
    proposals: PROPOSALS_MOCK,
    plans: ACTIVE_PLANS_MOCK,
    filters: { search: '', status: '', instrument: '' },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // Selectors globais
  readonly activeTab = computed(() => this.state().activeTab);
  readonly metrics = computed(() => this.state().metrics);
  readonly filters = computed(() => this.state().filters);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly sort = computed(() => this.state().sort);

  // Dados para os resumos do Dashboard (apenas os 5 primeiros)
  readonly dashboardProposals = computed(() => this.state().proposals.slice(0, 5));
  readonly dashboardPlans = computed(() => this.state().plans.slice(0, 5));

  // Dados unificados para as abas de Tabela
  readonly currentListItems = computed(() => {
    return this.activeTab() === 'proposals' ? this.state().proposals : this.state().plans;
  });

  readonly filteredListItems = computed(() => {
    let result: Proposal[] | ActivePlan[] = this.currentListItems();
    const f = this.filters();
    
    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item => item.title.includes(term) || item.agency.toLowerCase().includes(term)) as typeof result;
    }
    if (f.status) {
      result = result.filter(item => (item as any).status === f.status) as typeof result;
    }
    // Lógica de sort poderia ser aplicada aqui
    return result;
  });

  readonly filteredTotal = computed(() => this.filteredListItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredListItems().slice(start, start + pageSize);
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
    this.state.update(s => ({
      ...s,
      activeTab: tab,
      selectedIds: new Set(),
      filters: { search: '', status: '', instrument: '' },
      pagination: { ...s.pagination, page: 1 }
    }));
  }

  setSearch(search: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setStatus(status: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
  }

  setInstrument(instrument: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, instrument }, pagination: { ...s.pagination, page: 1 } }));
  }

  setSort(column: string) {
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

  toggleAllPage(items: (Proposal | ActivePlan)[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}