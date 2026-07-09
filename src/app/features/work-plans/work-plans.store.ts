// src/app/features/work-plans/work-plans.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import {
  WorkPlanListItem,
  WorkPlanRow,
  WorkPlanDashboard,
} from './work-plans.model';
import { WorkPlansService } from './work-plans.service';
import { NotificationService } from '../../shared/services/notification.service';
import { formatBRL } from '../../shared/utils/format';

type TabType = 'dashboard' | 'proposals' | 'active-plans';

interface State {
  activeTab:   TabType;
  dashboard:   WorkPlanDashboard;
  items:       WorkPlanListItem[];
  total:       number;
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; status: string };
  sort:        { column: string; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;
}

@Injectable()
export class WorkPlansStore {
  private svc    = inject(WorkPlansService);
  private notify = inject(NotificationService);

  private readonly state = signal<State>({
    activeTab:   'dashboard',
    dashboard:   { metrics: [], recentProposals: [], recentPlans: [] },
    items:       [],
    total:       0,
    loading:     false,
    error:       null,
    filters:     { search: '', status: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly activeTab   = computed(() => this.state().activeTab);
  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly sort        = computed(() => this.state().sort);
  readonly filteredTotal = computed(() => this.state().total);

  readonly metrics            = computed(() => this.state().dashboard.metrics);
  readonly dashboardProposals = computed(() => this.state().dashboard.recentProposals);
  readonly dashboardPlans     = computed(() => this.state().dashboard.recentPlans);

  readonly pageItems = computed<WorkPlanRow[]>(() => {
    const rows = this.state().items.map(p => this.toRow(p));
    const { column, direction } = this.state().sort;
    if (!column || !direction) return rows;
    const dir = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) =>
      String(a[column as keyof WorkPlanRow]).localeCompare(String(b[column as keyof WorkPlanRow]), 'pt-BR', { numeric: true }) * dir
    );
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // ── Load ──────────────────────────────────────────────────────────────────

  loadDashboard(): void {
    this.svc.getDashboard().subscribe({
      next: dashboard => this.state.update(s => ({ ...s, dashboard })),
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao carregar o dashboard.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }

  load(): void {
    const { page, pageSize } = this.state().pagination;
    const { search, status } = this.state().filters;
    const effectiveStatus = this.state().activeTab === 'active-plans' ? 'Active' : (status || undefined);

    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.svc.getAll({
      title:  search || undefined,
      status: effectiveStatus,
      skip:   (page - 1) * pageSize,
      take:   pageSize,
    }).subscribe({
      next: pageRes => this.state.update(s => ({
        ...s,
        items:   pageRes.data,
        total:   pageRes.total,
        loading: false,
      })),
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao carregar planos de trabalho.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.state.update(s => ({ ...s, loading: false, error: msg }));
        this.notify.error(msg);
      },
    });
  }

  // ── Tabs / Filters ──────────────────────────────────────────────────────────

  setTab(tab: TabType): void {
    this.state.update(s => ({
      ...s,
      activeTab:   tab,
      selectedIds: new Set(),
      filters:     { search: '', status: '' },
      pagination:  { ...s.pagination, page: 1 },
    }));
    if (tab === 'dashboard') this.loadDashboard();
    else this.load();
  }

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setStatus(status: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  // ── Sort / Pagination ───────────────────────────────────────────────────────

  setSort(column: string): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
    this.load();
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
    this.load();
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: WorkPlanRow[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Delete / Export ─────────────────────────────────────────────────────────

  delete(id: number, onSuccess?: () => void): void {
    this.svc.delete(id).subscribe({
      next: () => {
        this.load();
        this.notify.success('Plano de trabalho excluído com sucesso.');
        onSuccess?.();
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao excluir plano de trabalho.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }

  exportExcel(): void {
    this.svc.exportExcel().subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'planos-de-trabalho.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao exportar planilha.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }

  // ── Mapper ──────────────────────────────────────────────────────────────────

  private display(v: number | string | null): string {
    if (v == null || v === '') return '—';
    return typeof v === 'number' ? formatBRL(v) : String(v);
  }

  private toRow(p: WorkPlanListItem): WorkPlanRow {
    return {
      id:            p.id,
      title:         p.title  ?? '—',
      agency:        p.agency ?? '—',
      startDate:     p.startDate ?? '—',
      transferValue: this.display(p.transferValue),
      team:          p.team ?? '—',
      receivedValue: this.display(p.receivedValue),
      type:          p.type ?? '—',
      status:        p.status ?? '',
    };
  }
}
