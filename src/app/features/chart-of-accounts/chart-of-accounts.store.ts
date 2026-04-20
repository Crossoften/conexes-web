// src/app/features/chart-of-accounts/chart-of-accounts.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';
import { Account, AccountStatus, AccountType } from './chart-of-accounts.model';
import { ACCOUNTS_MOCK } from './chart-of-accounts.mock';

export type SortDirection = 'asc' | 'desc' | null;

interface AccountFilters {
  search: string;
  status: AccountStatus | '';
  type:   AccountType | '';
}

interface AccountSort {
  column:    keyof Account | '';
  direction: SortDirection;
}

interface AccountPagination {
  page:     number;
  pageSize: number;
}

interface AccountsState {
  items:       Account[];
  selected:    Set<string>;
  expanded:    Set<string>;
  filters:     AccountFilters;
  sort:        AccountSort;
  pagination:  AccountPagination;
  loading:     boolean;
}

const initialState: AccountsState = {
  items:      ACCOUNTS_MOCK,
  selected:   new Set(),
  expanded:   new Set(),
  filters:    { search: '', status: '', type: '' },
  sort:       { column: '', direction: null },
  pagination: { page: 1, pageSize: 50 },
  loading:    false,
};

export const AccountsStore = signalStore(
  withState(initialState),

  withComputed(({ items, filters, sort, pagination, selected, expanded }) => {

    const afterFilter = computed(() => {
      const { search, status, type } = filters();
      return items().filter(a => {
        const q = search.toLowerCase();
        return (
          (!search || a.title.toLowerCase().includes(q) || a.number.includes(search)) &&
          (!status || a.status === status) &&
          (!type   || a.type   === type)
        );
      });
    });

    const afterSort = computed(() => {
      const { column, direction } = sort();
      if (!column || !direction) return afterFilter();
      return [...afterFilter()].sort((a, b) => {
        const va = String(a[column as keyof Account] ?? '').toLowerCase();
        const vb = String(b[column as keyof Account] ?? '').toLowerCase();
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
    const expandedIds = computed(() => expanded());

    const allPageSelected = computed(() =>
      pageItems().length > 0 && pageItems().every(a => selectedIds().has(a.id))
    );

    const somePageSelected = computed(() =>
      pageItems().some(a => selectedIds().has(a.id)) && !allPageSelected()
    );

    return { pageItems, filteredTotal, selectedIds, expandedIds, allPageSelected, somePageSelected };
  }),

  withMethods(store => ({

    setSearch(search: string) {
      patchState(store, s => ({ filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
    },

    setStatus(status: AccountStatus | '') {
      patchState(store, s => ({ filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
    },

    setType(type: AccountType | '') {
      patchState(store, s => ({ filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } }));
    },

    setPage(page: number) {
      patchState(store, s => ({ pagination: { ...s.pagination, page } }));
    },

    setPageSize(pageSize: number) {
      patchState(store, _ => ({ pagination: { pageSize, page: 1 } }));
    },

    setSort(column: keyof Account) {
      patchState(store, s => {
        const same = s.sort.column === column;
        const direction: SortDirection = same
          ? s.sort.direction === 'asc' ? 'desc' : s.sort.direction === 'desc' ? null : 'asc'
          : 'asc';
        return { sort: { column: direction ? column : '' as keyof Account | '', direction } };
      });
    },

    toggleRow(id: string) {
      patchState(store, s => {
        const next = new Set(s.selected);
        next.has(id) ? next.delete(id) : next.add(id);
        return { selected: next };
      });
    },

    toggleAllPage(items: Account[]) {
      patchState(store, s => {
        const allSelected = items.every(i => s.selected.has(i.id));
        const next = new Set(s.selected);
        items.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
        return { selected: next };
      });
    },

    toggleExpand(id: string) {
      patchState(store, s => {
        const next = new Set(s.expanded);
        next.has(id) ? next.delete(id) : next.add(id);
        return { expanded: next };
      });
    },
  })),
);
