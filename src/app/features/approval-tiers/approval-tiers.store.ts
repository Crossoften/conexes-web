// src/app/features/approval-tiers/approval-tiers.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { ApprovalTier } from './approval-tiers.model';
import { ApprovalTiersService } from './approval-tiers.service';

interface State {
  items:      ApprovalTier[];
  loading:    boolean;
  error:      string | null;
  filters:    { search: string; status: string };
  sort:       { column: keyof ApprovalTier | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<number>;
}

@Injectable()
export class ApprovalTiersStore {
  private svc = inject(ApprovalTiersService);

  private readonly state = signal<State>({
    items:      [],
    loading:    false,
    error:      null,
    filters:    { search: '', status: '' },
    sort:       { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f    = this.filters();

    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item =>
        item.description?.toLowerCase().includes(term) ||
        String(item.level).includes(f.search)
      );
    }
    if (f.status) result = result.filter(item => item.status === f.status);

    return result;
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    return this.filteredItems().slice((page - 1) * pageSize, page * pageSize);
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll().subscribe({
      next: items => this.state.update(s => ({ ...s, items, loading: false })),
      error: err  => this.state.update(s => ({
        ...s,
        loading: false,
        error: err?.error?.message ?? 'Erro ao carregar alçadas.',
      })),
    });
  }

  deleteById(id: number): void {
    this.svc.delete(id).subscribe({
      next: () => this.state.update(s => ({
        ...s,
        items: s.items.filter(a => a.id !== id),
      })),
      error: err => this.state.update(s => ({
        ...s,
        error: err?.error?.message ?? 'Erro ao excluir alçada.',
      })),
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setStatus(status: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  setSort(column: keyof ApprovalTier): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: ApprovalTier[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}
