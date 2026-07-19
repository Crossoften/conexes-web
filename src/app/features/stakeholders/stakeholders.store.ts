// src/app/features/stakeholders/stakeholders.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { StakeholdersService } from './stakeholders.service';
import {
  StakeholderFilters,
  StakeholderListItem,
  StakeholderStatus,
  StakeholderType,
  StakeholderView,
  PersonType,
  VIEW_TYPES,
} from './stakeholders.model';

interface State {
  items:          StakeholderListItem[];
  total:          number;
  loading:        boolean;
  error:          string | null;
  exporting:      boolean;
  exportError:    string | null;
  // FE-S2: view (Fornecedores/Clientes) define o grupo de tipos; type (opcional) refina para um único tipo.
  filters:        { search: string; status: StakeholderStatus | ''; personType: PersonType | ''; view: StakeholderView; type: StakeholderType | '' };
  sort:           { column: string; direction: 'asc' | 'desc' | '' };
  pagination:     { page: number; pageSize: number };
  selectedIds:    Set<number>;
}

@Injectable()
export class StakeholdersStore {
  private svc = inject(StakeholdersService);

  private readonly state = signal<State>({
    items:       [],
    total:       0,
    loading:     false,
    error:       null,
    exporting:   false,
    exportError: null,
    filters:     { search: '', status: '', personType: '', view: 'suppliers', type: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  readonly items       = computed(() => this.state().items);
  readonly total       = computed(() => this.state().total);
  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly exporting   = computed(() => this.state().exporting);
  readonly exportError = computed(() => this.state().exportError);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pagination().pageSize))
  );

  readonly allPageSelected = computed(() => {
    const items = this.items();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.items();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    const { page, pageSize } = this.state().pagination;
    const { search, status, personType, view, type } = this.state().filters;
    const { column, direction }          = this.state().sort;

    const filters: StakeholderFilters = {
      take: pageSize,
      skip: (page - 1) * pageSize,
    };

    if (search)     filters.name       = search;
    if (status)     filters.status     = status;
    if (personType) filters.personType = personType;
    // FE-S2: um tipo específico refina; senão, envia o grupo da visão (Fornecedores/Clientes).
    const types = type ? [type] : VIEW_TYPES[view];
    if (types?.length) filters.type = types.join(',');
    // FE-S3: ordenação server-side.
    if (column && direction) { filters.sort = column; filters.order = direction; }

    this.svc.getAll(filters).subscribe({
      next: res => {
        const items = Array.isArray(res) ? res : (res as any).data ?? [];
        // FE-S1: envelope { data, count, pages } (tolerante a total/length legados).
        const total = Array.isArray(res) ? items.length : ((res as any).count ?? (res as any).total ?? items.length);
        this.state.update(s => ({ ...s, items, total, loading: false }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar stakeholders.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
      },
    });
  }

  deleteById(id: number): void {
    this.svc.delete(id).subscribe({
      next: () => this.load(),
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir stakeholder.';
        this.state.update(s => ({ ...s, error: msg }));
      },
    });
  }

  exportExcel(): void {
    this.state.update(s => ({ ...s, exporting: true, exportError: null }));

    this.svc.exportExcel().subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `stakeholders_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        this.state.update(s => ({ ...s, exporting: false }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao exportar planilha.';
        this.state.update(s => ({ ...s, exporting: false, exportError: msg }));
      },
    });
  }

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setStatus(status: StakeholderStatus | ''): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setPersonType(personType: PersonType | ''): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, personType }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  // FE-S2: troca a visão (Fornecedores/Clientes) e zera o filtro de tipo específico.
  setView(view: StakeholderView): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, view, type: '' }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  // FE-S2: refina para um tipo específico dentro da visão ('' = todos os tipos da visão).
  setType(type: StakeholderType | ''): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
    this.load();
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
    this.load();
  }

  // FE-S3: ordenação server-side — alterna a direção e recarrega (não reordena a página em memória).
  setSort(column: string): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction }, pagination: { ...s.pagination, page: 1 } };
    });
    this.load();
  }

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = s.items.every(item => newSet.has(item.id));
      s.items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  clearSelection(): void {
    this.state.update(s => ({ ...s, selectedIds: new Set() }));
  }
}