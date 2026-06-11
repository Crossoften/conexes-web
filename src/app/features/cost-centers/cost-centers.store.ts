// src/app/features/cost-centers/cost-centers.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { CostCenter, CostCenterStatus, CostCenterType } from './cost-centers.model';
import { CostCentersService } from './cost-centers.service';

export type SortDirection = 'asc' | 'desc' | null;

interface CostCenterFilters {
  search: string;
  status: CostCenterStatus | '';
  type:   CostCenterType | '';
}

interface CostCenterSort {
  column:    keyof CostCenter | '';
  direction: SortDirection;
}

interface CostCenterPagination {
  page:     number;
  pageSize: number;
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
  filters:    { search: '', status: '', type: '' },
  sort:       { column: '', direction: null },
  pagination: { page: 1, pageSize: 10 },
  loading:    false,
  error:      null,
};

export const CostCentersStore = signalStore(
  withState(initialState),

  withComputed(({ items, filters, sort, pagination, expanded }) => {

    const afterFilter = computed(() => {
      const { search, status, type } = filters();
      return items().filter(c => {
        const q = search.toLowerCase();
        return (
          (!search || c.title.toLowerCase().includes(q) || c.code.includes(search)) &&
          (!status || c.status === status) &&
          (!type   || c.type   === type)
        );
      });
    });

    const afterSort = computed(() => {
      const { column, direction } = sort();
      if (!column || !direction) return afterFilter();
      return [...afterFilter()].sort((a, b) => {
        const va = String(a[column as keyof CostCenter] ?? '').toLowerCase();
        const vb = String(b[column as keyof CostCenter] ?? '').toLowerCase();
        return direction === 'asc'
          ? va.localeCompare(vb, 'pt-BR')
          : vb.localeCompare(va, 'pt-BR');
      });
    });

    const filteredTotal = computed(() => afterSort().length);

    const pageItems = computed(() => {
      const { page, pageSize } = pagination();
      return afterSort().slice((page - 1) * pageSize, page * pageSize);
    });

    const expandedIds = computed(() => expanded());

    return { pageItems, filteredTotal, expandedIds };
  }),

  withMethods(store => {
    const svc = inject(CostCentersService);

    return {

      // ── API ─────────────────────────────────────────────────────────────

      load() {
        patchState(store, { loading: true, error: null });
        svc.getAll().subscribe({
          next: items => patchState(store, { items, loading: false }),
          error: err  => patchState(store, {
            loading: false,
            error: err?.error?.message ?? 'Erro ao carregar centros de custo.',
          }),
        });
      },

      updateItem(updated: CostCenter) {
        patchState(store, s => ({
          items: s.items.map(c => c.id === updated.id ? updated : c),
        }));
      },

      deleteById(id: number) {
        svc.delete(id).subscribe({
          next: () => patchState(store, s => ({
            items: s.items.filter(c => c.id !== id),
          })),
          error: err => patchState(store, {
            error: err?.error?.message ?? 'Erro ao excluir registro.',
          }),
        });
      },

      // ── Filters ──────────────────────────────────────────────────────────

      setSearch(search: string) {
        patchState(store, s => ({ filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
      },

      setStatus(status: CostCenterStatus | '') {
        patchState(store, s => ({ filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
      },

      setType(type: CostCenterType | '') {
        patchState(store, s => ({ filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
      },

      // ── Pagination ───────────────────────────────────────────────────────

      setPage(page: number) {
        patchState(store, s => ({ pagination: { ...s.pagination, page } }));
      },

      setPageSize(pageSize: number) {
        patchState(store, { pagination: { pageSize, page: 1 } });
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