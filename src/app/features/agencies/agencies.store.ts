// src/app/features/agencies/agencies.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { Agency, AgencyUpdatePayload } from './agencies.model';
import { AgenciesService } from './agencies.service';
import { NotificationService } from '../../shared/services/notification.service';

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
  private svc    = inject(AgenciesService);
  private notify = inject(NotificationService);

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
  readonly items       = computed(() => {
    const { column, direction } = this.sort();
    const items = this.state().items;
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });
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
    const { search, status } = this.state().filters;

    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.svc.getAll({
      legalName: search || undefined,
      status:    status || undefined,
      skip:      (page - 1) * pageSize,
      take:      pageSize,
    }).subscribe({
      next: page => this.state.update(s => ({
        ...s,
        items:   page.data,
        total:   page.total,
        loading: false,
      })),
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar órgãos.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
        this.notify.error(Array.isArray(msg) ? msg.join(', ') : msg);
      },
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

  // ── Carregar um registro completo (detalhe/edição) ─────────────────────────
  // A listagem (findAll) pode trazer uma projeção parcial; para o modal de
  // detalhe/edição buscamos a entidade inteira via GET /v1/grantors/{id}.

  loadOne(id: number, onSuccess: (agency: Agency) => void, onError?: (msg: string) => void): void {
    this.svc.getById(id).subscribe({
      next: agency => onSuccess(agency),
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao carregar o órgão.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.notify.error(msg);
        onError?.(msg);
      },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(id: number, payload: AgencyUpdatePayload, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.svc.update(id, payload).subscribe({
      next: () => {
        this.load();
        this.notify.success('Órgão atualizado com sucesso.');
        onSuccess?.();
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao atualizar órgão.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.notify.error(msg);
        onError?.(msg);
      },
    });
  }

  // ── Desativar (regra de negócio: 🗑 = desativar, não excluir) ───────────────

  deactivate(id: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.svc.update(id, { status: 'Inactive' }).subscribe({
      next: () => {
        this.load();
        this.notify.success('Órgão desativado com sucesso.');
        onSuccess?.();
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao desativar órgão.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.notify.error(msg);
        onError?.(msg);
      },
    });
  }

  // ── Delete (hard delete — não usado pela UI; regra do cliente é desativar) ──

  delete(id: number, onSuccess?: () => void, onError?: (msg: string) => void): void {
    this.svc.delete(id).subscribe({
      next: () => {
        this.load();
        this.notify.success('Órgão excluído com sucesso.');
        onSuccess?.();
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao excluir órgão.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.notify.error(msg);
        onError?.(msg);
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
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao exportar planilha.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }
}