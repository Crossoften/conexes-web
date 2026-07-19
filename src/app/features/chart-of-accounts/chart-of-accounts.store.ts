// src/app/features/chart-of-accounts/chart-of-accounts.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { Account, AccountStatus, AccountType } from './chart-of-accounts.model';
import { ChartOfAccountsService } from './chart-of-accounts.service';

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
  items:      Account[];
  selected:   Set<string>;
  expanded:   Set<string>;
  filters:    AccountFilters;
  sort:       AccountSort;
  pagination: AccountPagination;
  loading:    boolean;
  error:      string | null;
}

const initialState: AccountsState = {
  items:      [],
  selected:   new Set(),
  expanded:   new Set(),
  filters:    { search: '', status: '', type: '' },
  sort:       { column: '', direction: null },
  pagination: { page: 1, pageSize: 50 },
  loading:    false,
  error:      null,
};

export const AccountsStore = signalStore(
  withState(initialState),

  withComputed(({ items, filters, sort, pagination, selected, expanded }) => {

    const afterFilter = computed(() => {
      const { search, status, type } = filters();
      return items().filter(a => {
        const q = search.toLowerCase();
        return (
          (!search || a.title.toLowerCase().includes(q) || a.code.includes(search)) &&
          (!status || a.status === status) &&
          (!type   || a.accountType === type)
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

    const selectedIds  = computed(() => selected());
    const expandedIds  = computed(() => expanded());

    const allPageSelected = computed(() =>
      pageItems().length > 0 && pageItems().every(a => selectedIds().has(String(a.id)))
    );

    const somePageSelected = computed(() =>
      pageItems().some(a => selectedIds().has(String(a.id))) && !allPageSelected()
    );

    return { pageItems, filteredTotal, selectedIds, expandedIds, allPageSelected, somePageSelected };
  }),

  withMethods(store => {
    const svc = inject(ChartOfAccountsService);

    return {

      // ── API ─────────────────────────────────────────────────────────────

      load() {
        patchState(store, { loading: true, error: null });
        svc.getAll().subscribe({
          next: items => patchState(store, { items, loading: false }),
          error: err  => patchState(store, {
            loading: false,
            error: err?.error?.message ?? 'Erro ao carregar plano de contas.',
          }),
        });
      },

      deleteById(id: number) {
        svc.delete(id).subscribe({
          next: () => {
            patchState(store, s => ({
              items: s.items.filter(a => a.id !== id),
            }));
          },
          error: err => patchState(store, {
            error: err?.error?.message ?? 'Erro ao excluir conta.',
          }),
        });
      },

      // FE-PC-3: orçamento em lote — aplica no back e recarrega para refletir budgetManagement.
      setBudgetFlag(mode: 'all' | 'with_transactions' | 'none') {
        patchState(store, { loading: true, error: null });
        svc.setBudgetFlag(mode).subscribe({
          next: () => {
            svc.getAll().subscribe({
              next: items => patchState(store, { items, loading: false }),
              error: () => patchState(store, { loading: false }),
            });
          },
          error: err => patchState(store, {
            loading: false,
            error: err?.error?.message ?? 'Erro ao atualizar orçamento em lote.',
          }),
        });
      },

      // ── Filters ──────────────────────────────────────────────────────────

      setSearch(search: string) {
        patchState(store, s => ({ filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
      },

      setStatus(status: AccountStatus | '') {
        patchState(store, s => ({ filters: { ...s.filters, status }, pagination: { ...s.pagination, page: 1 } }));
      },

      setType(type: AccountType | '') {
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

      setSort(column: keyof Account) {
        patchState(store, s => {
          const same = s.sort.column === column;
          const direction: SortDirection = same
            ? s.sort.direction === 'asc' ? 'desc' : s.sort.direction === 'desc' ? null : 'asc'
            : 'asc';
          return { sort: { column: direction ? column : '' as keyof Account | '', direction } };
        });
      },

      // ── Selection ────────────────────────────────────────────────────────

      toggleRow(id: string) {
        patchState(store, s => {
          const next = new Set(s.selected);
          next.has(id) ? next.delete(id) : next.add(id);
          return { selected: next };
        });
      },

      toggleAllPage(items: Account[]) {
        patchState(store, s => {
          const allSelected = items.every(i => s.selected.has(String(i.id)));
          const next = new Set(s.selected);
          items.forEach(i => allSelected ? next.delete(String(i.id)) : next.add(String(i.id)));
          return { selected: next };
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

      // FE-PC-3: expandir/recolher todas as contas com filhos.
      toggleExpandAll() {
        patchState(store, s => {
          const withChildren = s.items.filter(a => a.children && a.children.length > 0).map(a => String(a.id));
          const allExpanded = withChildren.length > 0 && withChildren.every(id => s.expanded.has(id));
          return { expanded: allExpanded ? new Set<string>() : new Set(withChildren) };
        });
      },
    };
  }),
);
