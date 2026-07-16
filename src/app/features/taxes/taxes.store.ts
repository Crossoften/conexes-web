// src/app/features/taxes/taxes.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { Tax, StakeholderItem } from './taxes.model';
import { TaxesService } from './taxes.service';
import { TaxPayload } from './taxes.model';

interface State {
  items:       Tax[];
  stakeholders: StakeholderItem[];
  loading:     boolean;
  error:       string | null;
  filters:     { search: string; status: string };
  sort:        { column: keyof Tax | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;

  detailModal: {
    open:    boolean;
    mode:    'view' | 'edit';
    saving:  boolean;
    error:   string | null;
    tax:     Tax | null;
  };

  deleteModal: {
    open:     boolean;
    deleting: boolean;
    tax:      Tax | null;
  };
}

@Injectable()
export class TaxesStore {
  private svc = inject(TaxesService);

  private readonly state = signal<State>({
    items:       [],
    stakeholders: [],
    loading:     false,
    error:       null,
    filters:     { search: '', status: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),

    detailModal: {
      open:   false,
      mode:   'view',
      saving: false,
      error:  null,
      tax:    null,
    },

    deleteModal: {
      open:     false,
      deleting: false,
      tax:      null,
    },
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading      = computed(() => this.state().loading);
  readonly error        = computed(() => this.state().error);
  readonly filters      = computed(() => this.state().filters);
  readonly sort         = computed(() => this.state().sort);
  readonly pagination   = computed(() => this.state().pagination);
  readonly selectedIds  = computed(() => this.state().selectedIds);
  readonly stakeholders = computed(() => this.state().stakeholders);
  readonly detailModal  = computed(() => this.state().detailModal);
  readonly deleteModal  = computed(() => this.state().deleteModal);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f    = this.filters();

    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item =>
        item.serviceTitle?.toLowerCase().includes(term) ||
        item.serviceClassCode?.includes(f.search) ||
        this.getStakeholderName(item.stakeholderId).toLowerCase().includes(term)
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

  getStakeholderName(id: number): string {
    const s = this.state().stakeholders.find(s => s.id === id);
    return s ? s.name : String(id);
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));

    let taxesDone        = false;
    let stakeholdersDone = false;
    let items: Tax[]               = [];
    let stakeholders: StakeholderItem[] = [];

    const tryFinish = () => {
      if (taxesDone && stakeholdersDone) {
        this.state.update(s => ({ ...s, items, stakeholders, loading: false }));
      }
    };

    this.svc.getAll().subscribe({
      next: res => { items = res; taxesDone = true; tryFinish(); },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao carregar impostos.';
        this.state.update(s => ({ ...s, loading: false, error: msg }));
      },
    });

    this.svc.getStakeholders().subscribe({
      next: res => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.results ?? []);
        stakeholders = list.map((s: any) => ({
          id:       s.id,
          name:     s.name ?? s.tradeName ?? s.legalName ?? '',
          document: s.document ?? s.cnpj ?? '',
        }));
        stakeholdersDone = true;
        tryFinish();
      },
      error: () => { stakeholdersDone = true; tryFinish(); },
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

  setSort(column: keyof Tax): void {
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

  toggleAllPage(items: Tax[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Detail Modal ──────────────────────────────────────────────────────────

  openView(tax: Tax): void {
    this.state.update(s => ({
      ...s,
      detailModal: { open: true, mode: 'view', saving: false, error: null, tax },
    }));
  }

  openEdit(tax: Tax): void {
    this.state.update(s => ({
      ...s,
      detailModal: { open: true, mode: 'edit', saving: false, error: null, tax },
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

  saveTax(payload: TaxPayload): void {
    const modal = this.state().detailModal;
    if (!modal.tax) return;

    this.state.update(s => ({ ...s, detailModal: { ...s.detailModal, saving: true, error: null } }));

    // POST createOrUpdate (upsert por stakeholderId) — o contrato não tem PATCH/{id}.
    this.svc.save({ ...payload, stakeholderId: payload.stakeholderId || modal.tax.stakeholderId }).subscribe({
      next: () => {
        this.svc.getAll().subscribe({
          next: items => {
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
        const msg = err?.error?.message ?? 'Erro ao salvar.';
        this.state.update(s => ({ ...s, detailModal: { ...s.detailModal, saving: false, error: msg } }));
      },
    });
  }

  // ── Delete Modal ──────────────────────────────────────────────────────────

  openDelete(tax: Tax): void {
    this.state.update(s => ({
      ...s,
      deleteModal: { open: true, deleting: false, tax },
    }));
  }

  closeDeleteModal(): void {
    this.state.update(s => ({ ...s, deleteModal: { ...s.deleteModal, open: false } }));
  }

  confirmDelete(): void {
    const tax = this.state().deleteModal.tax;
    if (!tax) return;

    this.state.update(s => ({ ...s, deleteModal: { ...s.deleteModal, deleting: true } }));

    this.svc.delete(tax.id).subscribe({
      next: () => {
        this.state.update(s => ({
          ...s,
          items: s.items.filter(i => i.id !== tax.id),
          deleteModal: { open: false, deleting: false, tax: null },
          detailModal: { ...s.detailModal, open: false },
        }));
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir.';
        this.state.update(s => ({
          ...s,
          deleteModal: { ...s.deleteModal, deleting: false },
          detailModal: { ...s.detailModal, error: msg },
        }));
      },
    });
  }
}
