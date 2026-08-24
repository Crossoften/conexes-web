// src/app/features/cost-centers/cost-centers.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { CostCenter, CostCenterStatus, resolveEntityType } from './cost-centers.model';
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

    // Monta a hierarquia para exibição: Centros de Custo no topo e os Projetos
    // aninhados como "groups" do seu CC pai (via costCenterId). O back devolve
    // tudo plano; aqui agrupamos para a expansão em cascata. Projetos sem pai na
    // página atual caem como itens de topo (órfãos).
    const treeItems = computed<CostCenter[]>(() => {
      const all     = sortedItems();
      const parents = all.filter(i => resolveEntityType(i) === 'cost_center');
      const parentIds = new Set(parents.map(p => p.id));
      const childrenByParent = new Map<number, CostCenter[]>();
      const orphans: CostCenter[] = [];

      for (const i of all) {
        if (resolveEntityType(i) === 'cost_center') continue;
        if (i.costCenterId != null && parentIds.has(i.costCenterId)) {
          const arr = childrenByParent.get(i.costCenterId) ?? [];
          arr.push(i);
          childrenByParent.set(i.costCenterId, arr);
        } else {
          orphans.push(i);
        }
      }

      const withChildren = parents.map(p => ({
        ...p,
        _children: childrenByParent.get(p.id) ?? [],
      }));

      return [...withChildren, ...orphans];
    });

    // CC-02/CC-03: árvore recursiva de N níveis (Centro de Custo → Projeto → Atividade → …).
    // Achatada com profundidade para renderização, respeitando os nós expandidos.
    // Filhos por costCenterId (projetos de topo do CC) e por parentProjectId (subníveis).
    const treeFlat = computed<{ node: CostCenter; depth: number; hasChildren: boolean; key: string }[]>(() => {
      const all  = sortedItems();
      const isCC = (i: CostCenter) => resolveEntityType(i) === 'cost_center';
      const key  = (i: CostCenter) => `${resolveEntityType(i)}:${i.id}`;

      const ccIds       = new Set(all.filter(isCC).map(c => c.id));
      const projectIds  = new Set(all.filter(i => !isCC(i)).map(p => p.id));
      const byCostCenter    = new Map<number, CostCenter[]>();
      const byParentProject = new Map<number, CostCenter[]>();

      for (const i of all) {
        if (isCC(i)) continue;
        if (i.parentProjectId != null && projectIds.has(i.parentProjectId)) {
          const arr = byParentProject.get(i.parentProjectId) ?? []; arr.push(i); byParentProject.set(i.parentProjectId, arr);
        } else if (i.costCenterId != null && ccIds.has(i.costCenterId)) {
          const arr = byCostCenter.get(i.costCenterId) ?? []; arr.push(i); byCostCenter.set(i.costCenterId, arr);
        }
      }

      const childrenOf = (n: CostCenter): CostCenter[] =>
        isCC(n) ? (byCostCenter.get(n.id) ?? []) : (byParentProject.get(n.id) ?? []);

      const out: { node: CostCenter; depth: number; hasChildren: boolean; key: string }[] = [];
      const placed = new Set<number>();
      const exp = expanded();
      const walk = (n: CostCenter, depth: number) => {
        placed.add(n.id);
        const kids = childrenOf(n);
        out.push({ node: n, depth, hasChildren: kids.length > 0, key: key(n) });
        if (kids.length && exp.has(key(n))) for (const k of kids) walk(k, depth + 1);
      };

      for (const r of all.filter(isCC)) walk(r, 0);
      // projetos órfãos (pai fora da página) entram no topo
      for (const i of all) { if (!isCC(i) && !placed.has(i.id)) walk(i, 0); }
      return out;
    });

    return { sortedItems, treeItems, treeFlat, totalPages, expandedIds };
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

      deleteById(id: number, entityType: 'cost_center' | 'project') {
        svc.delete(id, entityType).subscribe({
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