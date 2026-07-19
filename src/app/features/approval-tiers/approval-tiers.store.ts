// src/app/features/approval-tiers/approval-tiers.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { ApprovalTier, ApprovalTierPayload, ApprovalScopeOption } from './approval-tiers.model';
import { ApprovalTiersService, ApprovalTierListParams } from './approval-tiers.service';

export interface UserItem { id: number; name: string; email?: string; }

interface State {
  items:       ApprovalTier[];
  users:       UserItem[];
  costCenters: ApprovalScopeOption[];
  projects:    ApprovalScopeOption[];
  activities:  ApprovalScopeOption[];
  loading:     boolean;
  error:       string | null;
  // status: filtro client-side (o back não expõe status); type: filtro server-side.
  filters:     { search: string; status: string; type: string };
  sort:        { column: keyof ApprovalTier | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  total:       number;   // AL-7: count total do back
  pages:       number;   // AL-7: total de páginas do back
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

  transferModal: {
    open:    boolean;
    saving:  boolean;
    error:   string | null;
    tier:    ApprovalTier | null;
  };

  copyingId: number | null;
}

@Injectable()
export class ApprovalTiersStore {
  private svc = inject(ApprovalTiersService);

  private readonly state = signal<State>({
    items:       [],
    users:       [],
    costCenters: [],
    projects:    [],
    activities:  [],
    loading:     false,
    error:       null,
    filters:     { search: '', status: '', type: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    total:       0,
    pages:       1,
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

    transferModal: {
      open:   false,
      saving: false,
      error:  null,
      tier:   null,
    },

    copyingId: null,
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly error       = computed(() => this.state().error);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);
  readonly users       = computed(() => this.state().users);
  readonly costCenters = computed(() => this.state().costCenters);
  readonly projects    = computed(() => this.state().projects);
  readonly activities  = computed(() => this.state().activities);
  readonly detailModal   = computed(() => this.state().detailModal);
  readonly deleteModal   = computed(() => this.state().deleteModal);
  readonly transferModal = computed(() => this.state().transferModal);
  readonly copyingId     = computed(() => this.state().copyingId);
  readonly exporting     = computed(() => this.state().exporting);

  // AL-7: total/páginas vêm do back (server-side).
  readonly total      = computed(() => this.state().total);
  readonly totalPages = computed(() => Math.max(1, this.state().pages));

  // AL-7: busca/tipo/ordenação/paginação são server-side. O único filtro sem
  // equivalente no back é "status" — aplicado client-side apenas na página atual.
  readonly pageItems = computed(() => {
    const items  = this.state().items;
    const status = this.filters().status;
    return status ? items.filter(item => item.status === status) : items;
  });

  /** Compat: usado pelo componente para calcular paginação (agora vem do back). */
  readonly filteredTotal = computed(() => this.state().total);

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

  private normalizeItems(res: any): { items: ApprovalTier[]; total: number; pages: number } {
    // AL-7: envelope { data, count, pages }; tolera array direto ou { items }.
    if (Array.isArray(res)) {
      return { items: res, total: res.length, pages: 1 };
    }
    const items: ApprovalTier[] = res?.data ?? res?.items ?? [];
    const total = res?.count ?? res?.total ?? items.length;
    const pages = res?.pages ?? 1;
    return { items, total, pages };
  }

  // AL-7: monta os parâmetros server-side a partir do estado atual.
  private buildParams(): ApprovalTierListParams {
    const s = this.state();
    const params: ApprovalTierListParams = {
      skip: (s.pagination.page - 1) * s.pagination.pageSize,
      take: s.pagination.pageSize,
    };
    if (s.filters.search) params.search = s.filters.search;
    if (s.filters.type)   params.type   = s.filters.type;
    if (s.sort.column && s.sort.direction) {
      params.sort  = String(s.sort.column);
      params.order = s.sort.direction;
    }
    return params;
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  /** Carga inicial: usuários + lookups de escopo (uma vez) + primeira página. */
  load(): void {
    this.svc.getUsers({ take: 500 }).subscribe({
      next: res => this.state.update(s => ({ ...s, users: this.normalizeUsers(res) })),
      error: () => {},
    });

    // AL-4: lookups de escopo (fire-and-forget; não bloqueiam a listagem).
    this.svc.getCostCenters().subscribe({ next: c => this.state.update(s => ({ ...s, costCenters: c })), error: () => {} });
    this.svc.getProjects().subscribe({   next: p => this.state.update(s => ({ ...s, projects: p })),    error: () => {} });
    this.svc.getActivities().subscribe({ next: a => this.state.update(s => ({ ...s, activities: a })),  error: () => {} });

    this.fetchTiers();
  }

  /** AL-7: recarrega a página atual da lista com os filtros/ordenação server-side. */
  private fetchTiers(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll(this.buildParams()).subscribe({
      next: res => {
        const { items, total, pages } = this.normalizeItems(res);
        this.state.update(s => ({ ...s, items, total, pages, loading: false }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar alçadas.';
        this.state.update(s => ({ ...s, loading: false, error: Array.isArray(msg) ? msg.join(', ') : msg }));
      },
    });
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
    this.fetchTiers();
  }

  /** Filtro client-side (o back não expõe status) — não recarrega. */
  setStatus(status: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
  }

  /** AL-7: filtro de tipo é server-side. */
  setType(type: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
    this.fetchTiers();
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  setSort(column: keyof ApprovalTier): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction }, pagination: { ...s.pagination, page: 1 } };
    });
    this.fetchTiers();
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
    this.fetchTiers();
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
    this.fetchTiers();
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
        this.state.update(s => ({ ...s, detailModal: { ...s.detailModal, open: false, saving: false } }));
        this.fetchTiers();
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
          deleteModal: { open: false, deleting: false, tier: null },
          detailModal: { ...s.detailModal, open: false },
        }));
        // AL-7: server-side — recarrega a página para manter count/páginas corretos.
        this.fetchTiers();
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

  // ── AL-6: Copiar / Duplicar ────────────────────────────────────────────────

  copyTier(tier: ApprovalTier): void {
    this.state.update(s => ({ ...s, copyingId: tier.id, error: null }));

    this.svc.copy(tier.id).subscribe({
      next: () => {
        // Recarrega a listagem para trazer a cópia recém-criada com o id do back.
        this.state.update(s => ({ ...s, copyingId: null }));
        this.fetchTiers();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao duplicar alçada.';
        this.state.update(s => ({ ...s, copyingId: null, error: Array.isArray(msg) ? msg.join(', ') : msg }));
      },
    });
  }

  // ── AL-6: Transferir para outro aprovador ──────────────────────────────────

  openTransfer(tier: ApprovalTier): void {
    this.state.update(s => ({
      ...s,
      transferModal: { open: true, saving: false, error: null, tier },
    }));
  }

  closeTransferModal(): void {
    this.state.update(s => ({ ...s, transferModal: { ...s.transferModal, open: false } }));
  }

  confirmTransfer(userId: number): void {
    const tier = this.state().transferModal.tier;
    if (!tier) return;
    if (!userId) {
      this.state.update(s => ({ ...s, transferModal: { ...s.transferModal, error: 'Selecione o novo aprovador.' } }));
      return;
    }

    this.state.update(s => ({ ...s, transferModal: { ...s.transferModal, saving: true, error: null } }));

    this.svc.transfer(tier.id, userId).subscribe({
      next: () => {
        this.state.update(s => ({
          ...s, transferModal: { open: false, saving: false, error: null, tier: null },
        }));
        this.fetchTiers();
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao transferir alçada.';
        this.state.update(s => ({
          ...s,
          transferModal: { ...s.transferModal, saving: false, error: Array.isArray(msg) ? msg.join(', ') : msg },
        }));
      },
    });
  }
}