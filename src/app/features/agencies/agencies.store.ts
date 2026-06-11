// src/app/features/agencies/agencies.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { Agency, AgencyUpdatePayload } from './agencies.model';
import { AgenciesService } from './agencies.service';

interface State {
  items:       Agency[];
  total:       number;
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; status: string };
  sort:        { column: keyof Agency | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;
}

@Injectable()
export class AgenciesStore {
  private svc = inject(AgenciesService);

  private readonly state = signal<State>({
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

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly items       = computed(() => this.state().items);
  readonly total       = computed(() => this.state().total);

  readonly allPageSelected = computed(() => {
    const items = this.state().items;
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.state().items;
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // ── Load ──────────────────────────────────────────────────────────────────

  load(): void {
    const { page, pageSize } = this.state().pagination;
    const { search } = this.state().filters;

    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.svc.getAll({
      legalName: search || undefined,
      skip:      (page - 1) * pageSize,
      take:      pageSize,
    }).subscribe({
      next: res => this.state.update(s => ({
        ...s,
        items:   res.data ?? (res as any),
        total:   res.total ?? (res as any)?.length ?? 0,
        loading: false,
      })),
      error: err => this.state.update(s => ({
        ...s,
        loading: false,
        error:   err?.error?.message ?? 'Erro ao carregar órgãos.',
      })),
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setSearch(search: string): void {
    this.state.update(s => ({
      ...s,
      filters:    { ...s.filters, search },
      pagination: { ...s.pagination, page: 1 },
    }));
    this.load();
  }

  setStatus(status: string): void {
    this.state.update(s => ({
      ...s,
      filters:    { ...s.filters, status },
      pagination: { ...s.pagination, page: 1 },
    }));
    this.load();
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  setSort(column: keyof Agency): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────

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

  toggleAllPage(items: Agency[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(id: number, payload: AgencyUpdatePayload, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.svc.update(id, payload).subscribe({
      next: () => {
        this.load();
        onSuccess?.();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao atualizar órgão.';
        onError?.(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  delete(id: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.svc.delete(id).subscribe({
      next: () => {
        this.load();
        onSuccess?.();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir órgão.';
        onError?.(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportExcel(): void {
    this.svc.exportExcel().subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'orgaos-concessionarios.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }
}