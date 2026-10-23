// src/app/features/financial-transfers/financial-transfers.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FinancialTransfer, TransferStatus, TransferType, TransferView } from './financial-transfers.model';
import { FinancialTransfersService } from './financial-transfers.service';
import { NotificationService } from '../../shared/services/notification.service';

/**
 * TR-12 / LB-07: os filtros da tela deixaram de ser Status e PIX/TED (que não
 * dizem nada sobre estes registros) e passaram a ser os que o relatório pede —
 * origem, destino e intervalo nas Transferências; conta e período nos
 * Lançamentos. São aplicados no servidor.
 */
export interface MovementFilters {
  view: TransferView;
  search: string;
  originAccountId: string;
  destinationAccountId: string;
  bankAccountId: string;
  startDate: string;
  endDate: string;
}

interface State {
  items: FinancialTransfer[];
  loading: boolean;
  error: string | null;
  filters: MovementFilters;
  sort: { column: keyof FinancialTransfer | ''; direction: 'asc' | 'desc' | '' };
  pagination: { page: number; pageSize: number };
  selectedIds: Set<string>;
}

const FILTROS_VAZIOS = {
  search: '', originAccountId: '', destinationAccountId: '', bankAccountId: '', startDate: '', endDate: '',
};

@Injectable()
export class FinancialTransfersStore {
  private readonly svc = inject(FinancialTransfersService);
  private readonly notify = inject(NotificationService);

  private readonly state = signal<State>({
    items: [],
    loading: false,
    error: null,
    filters: { view: 'TRANSFERS', ...FILTROS_VAZIOS },
    sort: { column: '', direction: '' },
    pagination: { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  load(): void {
    const f = this.state().filters;
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.svc.getAll(f.view, f).subscribe({
      next: items => this.state.update(s => ({ ...s, items, loading: false })),
      error: () => this.state.update(s => ({ ...s, items: [], loading: false, error: 'Não foi possível carregar os lançamentos.' })),
    });
  }

  // Selectors
  readonly loading = computed(() => this.state().loading);
  readonly error   = computed(() => this.state().error);
  readonly filters = computed(() => this.state().filters);
  readonly sort = computed(() => this.state().sort);
  readonly pagination = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  // A busca por texto segue local (sobre o resultado já filtrado no servidor).
  readonly filteredItems = computed(() => {
    const f = this.filters();
    if (!f.search) return this.state().items;
    const termo = f.search.toLowerCase();
    return this.state().items.filter(item =>
      item.description.toLowerCase().includes(termo) ||
      item.code.includes(termo) ||
      item.origin.toLowerCase().includes(termo) ||
      item.destination.toLowerCase().includes(termo),
    );
  });

  readonly sortedItems = computed(() => {
    const { column, direction } = this.sort();
    const items = this.filteredItems();
    if (!column || !direction) return items;
    return [...items].sort((a, b) => {
      const va = (a as any)[column], vb = (b as any)[column];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR', { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.sortedItems().slice(start, start + pageSize);
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // Updaters
  /** Trocar de visão zera os filtros — origem/destino não fazem sentido em Lançamentos. */
  setView(view: TransferView) {
    this.state.update(s => ({ ...s, filters: { view, ...FILTROS_VAZIOS }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  setSearch(search: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  /** TR-12 / LB-07: filtro aplicado no servidor — recarrega a lista. */
  setFiltro(campo: keyof MovementFilters, valor: string) {
    this.state.update(s => ({ ...s, filters: { ...s.filters, [campo]: valor }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  limparFiltros() {
    this.state.update(s => ({ ...s, filters: { view: s.filters.view, ...FILTROS_VAZIOS }, pagination: { ...s.pagination, page: 1 } }));
    this.load();
  }

  /** Indica se há algum filtro de servidor ativo (para mostrar o botão Limpar). */
  readonly temFiltroAtivo = computed(() => {
    const f = this.filters();
    return !!(f.originAccountId || f.destinationAccountId || f.bankAccountId || f.startDate || f.endDate);
  });

  setSort(column: keyof FinancialTransfer) {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); }

  toggleRow(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: FinancialTransfer[]) {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  readonly selectedCount = computed(() => this.state().selectedIds.size);
  clearSelection() { this.state.update(s => ({ ...s, selectedIds: new Set() })); }

  private get currentView(): TransferView { return this.state().filters.view; }

  /**
   * LB-06 / B5: duplicar um lançamento bancário. Usa o endpoint de cópia do
   * servidor, que leva junto a classificação (plano de contas, fornecedor,
   * centro de custo e as linhas de rateio).
   */
  duplicarLancamento(id: string): void {
    this.svc.copyEntry(id).subscribe({
      next: () => { this.notify.success('Lançamento duplicado.'); this.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Erro ao duplicar o lançamento.'),
    });
  }

  deleteOne(id: string): void {
    this.svc.delete(id, this.currentView).subscribe({
      next: () => { this.notify.success('Registro excluído.'); this.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Erro ao excluir o registro.'),
    });
  }

  deleteSelected(): void {
    const ids = [...this.state().selectedIds];
    if (!ids.length) return;
    const view = this.currentView;
    forkJoin(ids.map(id => this.svc.delete(id, view))).subscribe({
      next: () => { this.notify.success(`${ids.length} registro(s) excluído(s).`); this.clearSelection(); this.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Erro ao excluir em lote.'),
    });
  }

  /** Importa transferências/lançamentos por planilha (conforme a visão ativa). */
  importFile(file: File): void {
    this.state.update(s => ({ ...s, loading: true }));
    this.svc.importFile(file, this.currentView).subscribe({
      next: () => { this.notify.success('Planilha importada com sucesso.'); this.load(); },
      error: err => {
        this.state.update(s => ({ ...s, loading: false }));
        this.notify.error(err?.error?.message ?? 'Não foi possível importar a planilha.');
      },
    });
  }
}