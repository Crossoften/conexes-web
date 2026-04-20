// src/app/features/quotations/quotations.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { Quotation, RequisitionStatus } from './quotations.model';
import { QUOTATIONS_MOCK } from './quotations.mock';

export type SortDirection = 'asc' | 'desc' | null;

interface QuotationFilters {
  search:    string;
  status:    RequisitionStatus | '';
  requester: string;
  project:   string;
}

interface QuotationSort {
  column:    keyof Quotation | '';
  direction: SortDirection;
}

interface QuotationPagination {
  page:     number;
  pageSize: number;
}

interface QuotationsState {
  items:      Quotation[];
  selected:   Set<string>;
  filters:    QuotationFilters;
  sort:       QuotationSort;
  pagination: QuotationPagination;
  loading:    boolean;
}

const initialState: QuotationsState = {
  items:      QUOTATIONS_MOCK,
  selected:   new Set(),
  filters:    { search: '', status: '', requester: '', project: '' },
  sort:       { column: '', direction: null },
  pagination: { page: 1, pageSize: 10 },
  loading:    false,
};

export const QuotationsStore = signalStore(
  withState(initialState),

  withComputed(({ items, filters, sort, pagination, selected }) => {

    const afterFilter = computed(() => {
      const { search, status, requester, project } = filters();
      return items().filter(q => {
        const s = search.toLowerCase();
        return (
          (!search    || q.title.toLowerCase().includes(s) || q.typeId.includes(search)) &&
          (!status    || q.reqStatus === status) &&
          (!requester || q.requester.toLowerCase().includes(requester.toLowerCase())) &&
          (!project   || q.group.toLowerCase().includes(project.toLowerCase()))
        );
      });
    });

    const afterSort = computed(() => {
      const { column, direction } = sort();
      if (!column || !direction) return afterFilter();
      return [...afterFilter()].sort((a, b) => {
        const va = String(a[column as keyof Quotation] ?? '').toLowerCase();
        const vb = String(b[column as keyof Quotation] ?? '').toLowerCase();
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

    const selectedIds = computed(() => selected());

    const allPageSelected = computed(() =>
      pageItems().length > 0 && pageItems().every(q => selectedIds().has(q.id))
    );

    const somePageSelected = computed(() =>
      pageItems().some(q => selectedIds().has(q.id)) && !allPageSelected()
    );

    return { pageItems, filteredTotal, selectedIds, allPageSelected, somePageSelected };
  }),

  withMethods(store => ({

    setSearch(search: string) {
      patchState(store, s => ({ filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
    },
    setStatus(status: RequisitionStatus | '') {
      patchState(store, s => ({ filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
    },
    setRequester(requester: string) {
      patchState(store, s => ({ filters: { ...s.filters, requester }, pagination: { ...s.pagination, page: 1 } }));
    },
    setProject(project: string) {
      patchState(store, s => ({ filters: { ...s.filters, project }, pagination: { ...s.pagination, page: 1 } }));
    },
    setPage(page: number) {
      patchState(store, s => ({ pagination: { ...s.pagination, page } }));
    },
    setPageSize(pageSize: number) {
      patchState(store, _ => ({ pagination: { pageSize, page: 1 } }));
    },
    setSort(column: keyof Quotation) {
      patchState(store, s => {
        const same = s.sort.column === column;
        const direction: SortDirection = same
          ? s.sort.direction === 'asc' ? 'desc' : s.sort.direction === 'desc' ? null : 'asc'
          : 'asc';
        return { sort: { column: direction ? column : '' as keyof Quotation | '', direction } };
      });
    },
    toggleRow(id: string) {
      patchState(store, s => {
        const next = new Set(s.selected);
        next.has(id) ? next.delete(id) : next.add(id);
        return { selected: next };
      });
    },
    toggleAllPage(items: Quotation[]) {
      patchState(store, s => {
        const allSelected = items.every(i => s.selected.has(i.id));
        const next = new Set(s.selected);
        items.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
        return { selected: next };
      });
    },
  })),
);
