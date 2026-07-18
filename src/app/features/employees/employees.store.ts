// src/app/features/employees/employees.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { Employee, EmployeeUpdatePayload } from './employees.model';
import { EmployeesService } from './employees.service';

interface State {
  items:       Employee[];
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; type: string };
  sort:        { column: keyof Employee | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;
  selected:    Employee | null;
}

@Injectable()
export class EmployeesStore {
  private svc = inject(EmployeesService);

  private readonly state = signal<State>({
    items:       [],
    loading:     false,
    error:       null,
    filters:     { search: '', type: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    selected:    null,
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly selected    = computed(() => this.state().selected);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f    = this.filters();

    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item =>
        item.name?.toLowerCase().includes(term) ||
        item.cpf?.includes(f.search) ||
        item.title?.toLowerCase().includes(term)
      );
    }
    if (f.type)   result = result.filter(item => item.responsibleType === f.type);

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

  // ── Actions: Load ─────────────────────────────────────────────────────────

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll().subscribe({
      next: items => this.state.update(s => ({ ...s, items, loading: false })),
      error: err  => this.state.update(s => ({
        ...s,
        loading: false,
        error: err?.error?.message ?? 'Erro ao carregar colaboradores.',
      })),
    });
  }

  // ── Actions: Select (modal) ───────────────────────────────────────────────

  openDetail(employee: Employee): void {
    this.state.update(s => ({ ...s, selected: employee }));
    // A listagem pode vir enxuta; busca o detalhe completo e atualiza o modal.
    this.svc.getById(employee.id).subscribe({
      next: full => this.state.update(s =>
        s.selected?.id === employee.id ? { ...s, selected: full } : s),
      error: () => { /* mantém os dados da lista */ },
    });
  }

  closeDetail(): void {
    this.state.update(s => ({ ...s, selected: null }));
  }

  // ── Actions: Update ───────────────────────────────────────────────────────

  update(id: number, payload: EmployeeUpdatePayload): void {
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
        error: err?.error?.message ?? 'Erro ao atualizar colaborador.',
      })),
    });
  }

  // ── Actions: Delete ───────────────────────────────────────────────────────

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
        error: err?.error?.message ?? 'Erro ao excluir colaborador.',
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

  // ── Sort ──────────────────────────────────────────────────────────────────

  setSort(column: keyof Employee): void {
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

  // ── Row Selection ─────────────────────────────────────────────────────────

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: Employee[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }
}