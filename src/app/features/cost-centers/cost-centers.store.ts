// src/app/features/cost-centers/cost-centers.store.ts
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject, computed } from '@angular/core';
import { CostCenter, resolveEntityType } from './cost-centers.model';
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

/**
 * CC-03 fix: a hierarquia é montada no Front a partir da lista plana do back, então
 * paginar no servidor quebrava a árvore — pai numa página, filho em outra. O sintoma
 * eram os botões de expandir sumindo ao cadastrar um novo centro (o filho era empurrado
 * para a página seguinte) e a atividade recém-criada aparecendo "solta" na página 2.
 * Buscamos a lista inteira de uma vez e paginamos os nós RAIZ no cliente; assim cada
 * pai leva junto os seus filhos, em qualquer página.
 */
const FETCH_ALL_TAKE = 2000;

const initialState: CostCentersState = {
  items:      [],
  expanded:   new Set(),
  filters:    { name: '', type: '' },
  sort:       { column: '', direction: null },
  pagination: { page: 1, pageSize: 10, total: 0 },
  loading:    false,
  error:      null,
};

interface TreeRow {
  node:        CostCenter;
  depth:       number;
  hasChildren: boolean;
  key:         string;
}

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

    const expandedIds = computed(() => expanded());

    /**
     * Árvore completa de N níveis (Centro de Custo → Projeto → Atividade → …),
     * montada sobre TODOS os registros carregados. Filhos por `costCenterId`
     * (projetos do CC) e por `parentProjectId` (atividades do projeto).
     */
    const hierarchy = computed(() => {
      const all  = sortedItems();
      const isCC = (i: CostCenter) => resolveEntityType(i) === 'cost_center';
      const key  = (i: CostCenter) => `${resolveEntityType(i)}:${i.id}`;

      const ccIds      = new Set(all.filter(isCC).map(c => c.id));
      const projectIds = new Set(all.filter(i => !isCC(i)).map(p => p.id));
      const byCostCenter    = new Map<number, CostCenter[]>();
      const byParentProject = new Map<number, CostCenter[]>();
      // Só é raiz quem NÃO tem pai na lista; os demais entram pela expansão do pai.
      const childIds = new Set<number>();

      for (const i of all) {
        if (isCC(i)) continue;
        if (i.parentProjectId != null && projectIds.has(i.parentProjectId)) {
          const arr = byParentProject.get(i.parentProjectId) ?? []; arr.push(i); byParentProject.set(i.parentProjectId, arr);
          childIds.add(i.id);
        } else if (i.costCenterId != null && ccIds.has(i.costCenterId)) {
          const arr = byCostCenter.get(i.costCenterId) ?? []; arr.push(i); byCostCenter.set(i.costCenterId, arr);
          childIds.add(i.id);
        }
      }

      const childrenOf = (n: CostCenter): CostCenter[] =>
        isCC(n) ? (byCostCenter.get(n.id) ?? []) : (byParentProject.get(n.id) ?? []);

      // Raízes = Centros de Custo + não-CC sem pai carregado (órfãos reais),
      // na mesma ordem em que o back devolveu.
      const roots = all.filter(i => isCC(i) || !childIds.has(i.id));

      return { roots, childrenOf, key };
    });

    // A paginação conta RAÍZES, não linhas: um pai e seus filhos nunca se separam.
    const totalRoots = computed(() => hierarchy().roots.length);

    const totalPages = computed(() =>
      Math.max(1, Math.ceil(totalRoots() / pagination().pageSize))
    );

    /** Linhas visíveis: as raízes da página atual, cada uma seguida dos filhos expandidos. */
    const treeFlat = computed<TreeRow[]>(() => {
      const { roots, childrenOf, key } = hierarchy();
      const { page, pageSize } = pagination();
      const start = (page - 1) * pageSize;
      const exp   = expanded();

      const out: TreeRow[] = [];
      const walk = (n: CostCenter, depth: number) => {
        const kids = childrenOf(n);
        out.push({ node: n, depth, hasChildren: kids.length > 0, key: key(n) });
        if (kids.length && exp.has(key(n))) for (const k of kids) walk(k, depth + 1);
      };

      for (const r of roots.slice(start, start + pageSize)) walk(r, 0);
      return out;
    });

    return { sortedItems, treeFlat, totalRoots, totalPages, expandedIds };
  }),

  withMethods(store => {
    const svc = inject(CostCentersService);

    /** Filtros continuam no servidor; a paginação é do cliente (ver FETCH_ALL_TAKE). */
    function buildParams(overrides: { name?: string; type?: string } = {}) {
      const { name, type } = { ...store.filters(), ...overrides };
      return {
        ...(name ? { name } : {}),
        ...(type ? { type } : {}),
        skip: 1,
        take: FETCH_ALL_TAKE,
      };
    }

    function fetch(overrides: { name?: string; type?: string } = {}) {
      patchState(store, { loading: true, error: null });
      svc.getAll(buildParams(overrides)).subscribe({
        next: res => {
          patchState(store, s => ({
            items: Array.isArray(res) ? res : (res.data ?? []),
            pagination: {
              ...s.pagination,
              total: Array.isArray(res) ? (res as CostCenter[]).length : ((res as any).count ?? (res as any).total ?? 0),
            },
            loading: false,
          }));
          // Recarregar (ex.: após salvar no modal) pode encurtar a lista — mantém a
          // página atual sempre dentro do intervalo válido em vez de mostrar vazio.
          const last = Math.max(1, Math.ceil(store.totalRoots() / store.pagination().pageSize));
          if (store.pagination().page > last) {
            patchState(store, s => ({ pagination: { ...s.pagination, page: last } }));
          }
        },
        error: err => patchState(store, {
          loading: false,
          error: err?.error?.message ?? 'Erro ao carregar registros.',
        }),
      });
    }

    return {

      // ── API ─────────────────────────────────────────────────────────────

      load() { fetch(); },

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
        fetch({ name });
      },

      setType(type: string) {
        patchState(store, s => ({
          filters:    { ...s.filters, type },
          pagination: { ...s.pagination, page: 1 },
        }));
        fetch({ type });
      },

      // ── Pagination (client-side: a lista já está inteira em memória) ──────

      setPage(page: number) {
        const last = Math.max(1, Math.ceil(store.totalRoots() / store.pagination().pageSize));
        const safe = Math.min(Math.max(1, page), last);
        patchState(store, s => ({ pagination: { ...s.pagination, page: safe } }));
      },

      setPageSize(pageSize: number) {
        patchState(store, s => ({ pagination: { ...s.pagination, pageSize, page: 1 } }));
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
