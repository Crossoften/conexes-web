// src/app/features/approval-tiers/approval-tiers.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { ApprovalTier, ApprovalTierPayload } from './approval-tiers.model';
import { ApprovalTiersService } from './approval-tiers.service';

export interface UserItem { id: number; name: string; email?: string; }

interface State {
  items:       ApprovalTier[];
  users:       UserItem[];
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; status: string };
  sort:        { column: keyof ApprovalTier | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;
  exporting:   boolean;

  detailModal: {
    open:    boolean;
    mode:    'view' | 'edit';
    saving:  boolean;
    error:   string | null;
    tier:    ApprovalTier | null;
  };

  deleteModal: {
    open:     boolean;
    deleting: boolean;
    tier:     ApprovalTier | null;
  };
}

@Injectable()
export class ApprovalTiersStore {
  private svc = inject(ApprovalTiersService);

  private readonly state = signal<State>({
    items:       [],
    users:       [],
    loading:     false,
    error:       null,
    filters:     { search: '', status: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
    exporting:   false,

    detailModal: {
      open:   false,
      mode:   'view',
      saving: false,
      error:  null,
      tier:   null,
    },

    deleteModal: {
      open:     false,
      deleting: false,
      tier:     null,
    },
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly users       = computed(() => this.state().users);
  readonly detailModal = computed(() => this.state().detailModal);
  readonly deleteModal = computed(() => this.state().deleteModal);
  readonly exporting   = computed(() => this.state().exporting);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f    = this.filters();

    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item =>
        item.description?.toLowerCase().includes(term) ||
        String(item.level).includes(f.search) ||
        this.getUserName(item.userId).toLowerCase().includes(term)
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  getUserName(id: number): string {
    const u = this.state().users.find(u => u.id === id);
    return u ? u.name : String(id);
  }

  private normalizeUsers(res: any): UserItem[] {
    // Suporta resposta paginada { data: [] } ou array direto
    const list: any[] = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
    return list.map((u: any) => ({
      id:    u.id,
      name:  u.name && u.surname ? `${u.name} ${u.surname}` : (u.name ?? u.email ?? String(u.id)),
      email: u.email,
    }));
  }

  private normalizeItems(res: any): ApprovalTier[] {
    // Suporta resposta paginada { data: [] } ou array direto
    return Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    let tiersDone = false;
    let usersDone = false;
    let items: ApprovalTier[] = [];
    let users: UserItem[]     = [];

    const tryFinish = () => {
      if (tiersDone && usersDone) {
        this.state.update(s => ({ ...s, items, users, loading: false }));
      }
    };

    this.svc.getAll().subscribe({
      next: res => {
        items = this.normalizeItems(res);
        tiersDone = true;
        tryFinish();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar alçadas.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
      },
    });

    // Busca todos os usuários disponíveis para o select (take alto para não paginar)
    this.svc.getUsers({ take: 500 }).subscribe({
      next: res => {
        users = this.normalizeUsers(res);
        usersDone = true;
        tryFinish();
      },
      error: () => {
        // Falha silenciosa: a listagem carrega mesmo sem usuários
        usersDone = true;
        tryFinish();
      },
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

  // ── Detail Modal ──────────────────────────────────────────────────────────

  openView(tier: ApprovalTier): void {
    this.state.update(s => ({
      ...s,
      detailModal: { open: true, mode: 'view', saving: false, error: null, tier },
    }));
  }

  openEdit(tier: ApprovalTier): void {
    this.state.update(s => ({
      ...s,
      detailModal: { open: true, mode: 'edit', saving: false, error: null, tier },
    }));
  }

  switchToEdit(): void {
    this.state.update(s => ({
      ...s,
      detailModal: { ...s.detailModal, mode: 'edit' },
    }));
  }

  closeDetailModal(): void {
    this.state.update(s => ({
      ...s,
      detailModal: { ...s.detailModal, open: false },
    }));
  }

  saveTier(id: number, payload: ApprovalTierPayload): void {
    this.state.update(s => ({ ...s, detailModal: { ...s.detailModal, saving: true, error: null } }));

    this.svc.update(id, payload).subscribe({
      next: () => {
        this.svc.getAll().subscribe({
          next: res => {
            const items = this.normalizeItems(res);
            this.state.update(s => ({
              ...s, items,
              detailModal: { ...s.detailModal, open: false, saving: false },
            }));
          },
          error: () => {
            this.state.update(s => ({
              ...s,
              detailModal: { ...s.detailModal, open: false, saving: false },
            }));
          },
        });
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao salvar alçada.';
        this.state.update(s => ({ ...s, detailModal: { ...s.detailModal, saving: false, error: msg } }));
      },
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportExcel(): void {
    this.state.update(s => ({ ...s, exporting: true }));

    this.svc.exportExcel().subscribe({
      next: blob => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `alcadas-aprovacao-${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.state.update(s => ({ ...s, exporting: false }));
      },
      error: () => {
        this.state.update(s => ({ ...s, exporting: false }));
      },
    });
  }

  // ── Delete Modal ──────────────────────────────────────────────────────────

  openDelete(tier: ApprovalTier): void {
    this.state.update(s => ({
      ...s,
      deleteModal: { open: true, deleting: false, tier },
    }));
  }

  closeDeleteModal(): void {
    this.state.update(s => ({ ...s, deleteModal: { ...s.deleteModal, open: false } }));
  }

  confirmDelete(): void {
    const tier = this.state().deleteModal.tier;
    if (!tier) return;

    this.state.update(s => ({ ...s, deleteModal: { ...s.deleteModal, deleting: true } }));

    this.svc.delete(tier.id).subscribe({
      next: () => {
        this.state.update(s => ({
          ...s,
          items: s.items.filter(i => i.id !== tier.id),
          deleteModal: { open: false, deleting: false, tier: null },
          detailModal: { ...s.detailModal, open: false },
        }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir alçada.';
        this.state.update(s => ({
          ...s,
          deleteModal: { ...s.deleteModal, deleting: false },
          detailModal: { ...s.detailModal, error: msg },
        }));
      },
    });
  }
}