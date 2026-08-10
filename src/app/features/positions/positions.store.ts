// src/app/features/positions/positions.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { Position, PositionPayload } from './positions.model';
import { PositionsService } from './positions.service';

interface State {
  items:      Position[];
  loading:    boolean;
  error:      string | null;
  selected:   Position | null;
  filters:    { search: string; type: string; status: string };
  sort:       { column: keyof Position | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<number>;
}

@Injectable()
export class PositionsStore {
  private svc = inject(PositionsService);

  private readonly state = signal<State>({
    items:      [],
    loading:    false,
    error:      null,
    selected:   null,
    filters:    { search: '', type: '', status: '' },
    sort:       { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly selected    = computed(() => this.state().selected);
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
        item.purpose?.toLowerCase().includes(term) ||
        item.type?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term)
      );
    }
    if (f.type)   result = result.filter(item => item.type === f.type);
    if (f.status) result = result.filter(item => item.status === f.status);

    return result;
  });

  readonly sortedItems = computed(() => {
    const { column, direction } = this.sort();
    const items = this.filteredItems();
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    return this.sortedItems().slice((page - 1) * pageSize, page * pageSize);
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
        error: err?.error?.message ?? 'Erro ao carregar corpo diretivo.',
      })),
    });
  }

  // ── Detalhe / Edição (modal) ──────────────────────────────────────────────

  openDetail(item: Position): void {
    this.state.update(s => ({ ...s, selected: item }));
    // A listagem pode vir enxuta; busca o detalhe completo e atualiza o modal.
    this.svc.getById(item.id).subscribe({
      next: full => this.state.update(s =>
        s.selected?.id === item.id ? { ...s, selected: full } : s),
      error: () => { /* mantém os dados da lista */ },
    });
  }

  closeDetail(): void {
    this.state.update(s => ({ ...s, selected: null }));
  }

  update(id: number, payload: PositionPayload): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.update(id, payload).subscribe({
      next: updated => this.state.update(s => ({
        ...s,
        loading:  false,
        selected: null,
        items:    s.items.map(item => item.id === id ? updated : item),
      })),
      error: err => this.state.update(s => ({
        ...s,
        loading: false,
        error: err?.error?.message ?? 'Erro ao atualizar corpo diretivo.',
      })),
    });
  }

  delete(id: number): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.delete(id).subscribe({
      next: () => this.state.update(s => ({
        ...s,
        loading:  false,
        selected: null,
        items:    s.items.filter(item => item.id !== id),
      })),
      error: err => this.state.update(s => ({
        ...s,
        loading: false,
        error: err?.error?.message ?? 'Erro ao excluir corpo diretivo.',
      })),
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setType(type: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
  }

  setStatus(status: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  setSort(column: keyof Position): void {
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

  toggleAllPage(items: Position[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}
