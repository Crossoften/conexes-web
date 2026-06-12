// src/app/features/cost-centers/cost-centers.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { CostCenter, CostCenterStatus } from './cost-centers.model';
import { CostCentersService } from './cost-centers.service';

export type SortDirection = 'asc' | 'desc' | null;

interface CostCenterFilters {
  name: string;
  type: string;
}

interface CostCenterSort {
  column:    keyof CostCenter | '';
  direction: SortDirection;
}

interface CostCenterPagination {
  page:     number;
  pageSize: number;
  total:    number;
}

interface CostCentersState {
  items:      CostCenter[];
  expanded:   Set<string>;
  filters:    CostCenterFilters;
  sort:       CostCenterSort;
  pagination: CostCenterPagination;
  loading:    boolean;
  error:      string | null;
}

const initialState: CostCentersState = {
  items:      [],
  expanded:   new Set(),
  filters:    { name: '', type: '' },
  sort:       { column: '', direction: null },
  pagination: { page: 1, pageSize: 10, total: 0 },
  loading:    false,
  error:      null,
};

export const CostCentersStore = signalStore(
  withState(initialState),

  withComputed(({ items, sort, pagination, expanded }) => {

    const sortedItems = computed(() => {
      const { column, direction } = sort();
      if (!column || !direction) return items();
      return [...items()].sort((a, b) => {
        const va = String(a[column as keyof CostCenter] ?? '').toLowerCase();
        const vb = String(b[column as keyof CostCenter] ?? '').toLowerCase();
        return direction === 'asc'
          ? va.localeCompare(vb, 'pt-BR')
          : vb.localeCompare(va, 'pt-BR');
      });
    });

    const totalPages = computed(() =>
      Math.max(1, Math.ceil(pagination().total / pagination().pageSize))
    );

    const expandedIds = computed(() => expanded());

    return { sortedItems, totalPages, expandedIds };
  }),

  withMethods(store => {
    const svc = inject(CostCentersService);

    function buildParams() {
      const { name, type }       = store.filters();
      const { page, pageSize }   = store.pagination();
      return {
        ...(name ? { name } : {}),
        ...(type ? { type } : {}),
        skip: page,
        take: pageSize,
      };
    }

    return {

      // ── API ─────────────────────────────────────────────────────────────

      load() {
        patchState(store, { loading: true, error: null });
        svc.getAll(buildParams()).subscribe({
          next: res => patchState(store, {
            items:   Array.isArray(res) ? res : (res.data ?? []),
            pagination: {
              ...store.pagination(),
              total: Array.isArray(res) ? (res as CostCenter[]).length : (res.total ?? 0),
            },
            loading: false,
          }),
          error: err => patchState(store, {
            loading: false,
            error: err?.error?.message ?? 'Erro ao carregar registros.',
          }),
        });
      },

      updateItem(updated: CostCenter) {
        patchState(store, s => ({
          items: s.items.map(c => c.id === updated.id ? updated : c),
        }));
      },

      deleteById(id: number, type: string) {
        svc.delete(id, type).subscribe({
          next: () => patchState(store, s => ({
            items: s.items.filter(c => c.id !== id),
            pagination: { ...s.pagination, total: Math.max(0, s.pagination.total - 1) },
          })),
          error: err => patchState(store, {
            error: err?.error?.message ?? 'Erro ao excluir registro.',
          }),
        });
      },

      // ── Filters ──────────────────────────────────────────────────────────

      setName(name: string) {
        patchState(store, s => ({
          filters:    { ...s.filters, name },
          pagination: { ...s.pagination, page: 1 },
        }));
        svc.getAll({ ...buildParams(), name, skip: 1 }).subscribe({
          next: res => patchState(store, {
            items:      Array.isArray(res) ? res : (res.data ?? []),
            pagination: { ...store.pagination(), total: Array.isArray(res) ? (res as CostCenter[]).length : (res.total ?? 0) },
            loading: false,
          }),
          error: err => patchState(store, { loading: false, error: err?.error?.message ?? 'Erro ao carregar registros.' }),
        });
      },

      setType(type: string) {
        patchState(store, s => ({
          filters:    { ...s.filters, type },
          pagination: { ...s.pagination, page: 1 },
        }));
        svc.getAll({ ...buildParams(), type, skip: 1 }).subscribe({
          next: res => patchState(store, {
            items:      Array.isArray(res) ? res : (res.data ?? []),
            pagination: { ...store.pagination(), total: Array.isArray(res) ? (res as CostCenter[]).length : (res.total ?? 0) },
            loading: false,
          }),
          error: err => patchState(store, { loading: false, error: err?.error?.message ?? 'Erro ao carregar registros.' }),
        });
      },

      // ── Pagination ───────────────────────────────────────────────────────

      setPage(page: number) {
        patchState(store, s => ({ pagination: { ...s.pagination, page } }));
        svc.getAll({ ...buildParams(), skip: page }).subscribe({
          next: res => patchState(store, {
            items:      Array.isArray(res) ? res : (res.data ?? []),
            pagination: { ...store.pagination(), total: Array.isArray(res) ? (res as CostCenter[]).length : (res.total ?? 0) },
            loading: false,
          }),
          error: err => patchState(store, { loading: false, error: err?.error?.message ?? 'Erro ao carregar registros.' }),
        });
      },

      setPageSize(pageSize: number) {
        patchState(store, s => ({ pagination: { ...s.pagination, pageSize, page: 1 } }));
        svc.getAll({ ...buildParams(), take: pageSize, skip: 1 }).subscribe({
          next: res => patchState(store, {
            items:      Array.isArray(res) ? res : (res.data ?? []),
            pagination: { ...store.pagination(), total: Array.isArray(res) ? (res as CostCenter[]).length : (res.total ?? 0) },
            loading: false,
          }),
          error: err => patchState(store, { loading: false, error: err?.error?.message ?? 'Erro ao carregar registros.' }),
        });
      },

      // ── Sort ─────────────────────────────────────────────────────────────

      setSort(column: keyof CostCenter) {
        patchState(store, s => {
          const same = s.sort.column === column;
          const direction: SortDirection = same
            ? s.sort.direction === 'asc' ? 'desc' : s.sort.direction === 'desc' ? null : 'asc'
            : 'asc';
          return { sort: { column: direction ? column : '' as keyof CostCenter | '', direction } };
        });
      },

      // ── Expand ───────────────────────────────────────────────────────────

      toggleExpand(id: string) {
        patchState(store, s => {
          const next = new Set(s.expanded);
          next.has(id) ? next.delete(id) : next.add(id);
          return { expanded: next };
        });
      },
    };
  }),
);