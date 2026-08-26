// src/app/features/chart-of-accounts/chart-of-accounts-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AccountsStore } from './chart-of-accounts.store';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsDetailModalComponent } from './components/chart-of-accounts-detail.modal';
import { Account, AccountStatus, AccountType, ACCOUNT_STATUS_CONFIG, ACCOUNT_TYPE_LABELS } from './chart-of-accounts.model';

interface TreeRow {
  node:        any;
  depth:       number;
  hasChildren: boolean;
}

@Component({
  selector: 'app-chart-of-accounts-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, ChartOfAccountsDetailModalComponent],
  providers: [AccountsStore],
  templateUrl: './chart-of-accounts-list.page.html',
  styleUrl: './chart-of-accounts-list.page.scss',
})
export class ChartOfAccountsListPage implements OnInit {
  readonly store        = inject(AccountsStore);
  readonly router       = inject(Router);
  private  svc          = inject(ChartOfAccountsService);
  private  http         = inject(HttpClient);

  // PC-05: lookup de Centro de custo/Projeto/Atividade para exibir o vínculo e filtrar.
  readonly ccMap     = signal<Map<string, string>>(new Map());
  readonly ccOptions = signal<{ id: string; name: string }[]>([]);
  linkedName(category: unknown): string {
    const key = String(category ?? '');
    return key ? (this.ccMap().get(key) ?? '—') : '—';
  }
  onCostCenterFilter(v: string): void { this.store.setCostCenter(v); }
  private loadCostCenters(): void {
    this.http.get<{ data?: any[] } | any[]>(`${environment.apiUrl}/v1/projects`, { params: { take: '500' } })
      .subscribe({
        next: res => {
          const rows = Array.isArray(res) ? res : (res.data ?? []);
          const map = new Map<string, string>();
          const opts: { id: string; name: string }[] = [];
          for (const r of rows) {
            const id = String(r.id); const name = String(r.name ?? r.title ?? r.id);
            map.set(id, name); opts.push({ id, name });
          }
          this.ccMap.set(map); this.ccOptions.set(opts);
        },
        error: () => {},
      });
  }
  readonly statusConfig = ACCOUNT_STATUS_CONFIG;

  readonly statusOptions: { label: string; value: AccountStatus | '' }[] = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Inativo',            value: 'Inactive' },
  ];

  // Filtro por Tipo de Conta (valores canônicos sem acento; rótulo acentuado).
  readonly typeOptions: { label: string; value: AccountType | '' }[] = [
    { label: 'Selecione o tipo', value: ''           },
    { label: 'Sintética',        value: 'Sintetica'  },
    { label: 'Analítica',        value: 'Analitica'  },
  ];

  /** FE-PC-1: rótulo amigável do Tipo de Conta (dado canônico sem acento). */
  accountTypeLabel(v: string): string {
    return ACCOUNT_TYPE_LABELS[v] ?? v ?? '—';
  }

  statusVariant(s: any): string { return this.statusConfig[s as AccountStatus]?.variant ?? 'neutral'; }
  statusLabel(s: any): string { return this.statusConfig[s as AccountStatus]?.label ?? String(s ?? ''); }

  readonly pageSizeOptions = [10, 25, 50, 100, 200, 500];

  // ── B18: listagem hierárquica única (N níveis) no padrão Centro de custo ────
  readonly treeRoots   = signal<Account[]>([]);
  readonly treeLoading = signal(false);
  readonly treeError   = signal<string | null>(null);
  readonly expanded    = signal<Set<number>>(new Set());

  loadTree(): void {
    this.treeLoading.set(true);
    this.treeError.set(null);
    this.svc.tree().subscribe({
      next: (roots) => { this.treeRoots.set(roots ?? []); this.treeLoading.set(false); },
      error: (err) => {
        this.treeLoading.set(false);
        this.treeError.set(err?.error?.message ?? 'Erro ao carregar plano de contas.');
      },
    });
  }

  toggleExpand(id: number): void {
    const next = new Set(this.expanded());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expanded.set(next);
  }

  /** Ordenação restrita a irmãos para não quebrar a hierarquia. */
  private sortSiblings(nodes: any[]): any[] {
    const { column, direction } = this.store.sort();
    if (!column || !direction) return nodes;
    return [...nodes].sort((a, b) => {
      const va = String(a[column] ?? '').toLowerCase();
      const vb = String(b[column] ?? '').toLowerCase();
      return direction === 'asc'
        ? va.localeCompare(vb, 'pt-BR')
        : vb.localeCompare(va, 'pt-BR');
    });
  }

  /** Com busca/filtros ativos a hierarquia é achatada mostrando só os nós que casam. */
  private readonly searchMatches = computed<any[] | null>(() => {
    const { search, status, type, costCenter } = this.store.filters();
    if (!search && !status && !type && !costCenter) return null;
    const q = search.toLowerCase();
    const out: any[] = [];
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        const ok =
          (!search || String(n.title ?? '').toLowerCase().includes(q) || String(n.code ?? '').includes(search)) &&
          (!status || n.status === status) &&
          (!type   || n.accountType === type) &&
          (!costCenter || String(n.category ?? '') === costCenter);
        if (ok) out.push(n);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(this.treeRoots());
    return this.sortSiblings(out);
  });

  readonly filteredTotal = computed(() =>
    this.searchMatches()?.length ?? this.treeRoots().length
  );

  /** Achata a árvore respeitando os nós expandidos, com profundidade para indentação. */
  readonly treeFlat = computed<TreeRow[]>(() => {
    const { page, pageSize } = this.store.pagination();
    const start = (page - 1) * pageSize;
    const matches = this.searchMatches();
    if (matches) {
      return matches.slice(start, start + pageSize).map(node => ({ node, depth: 0, hasChildren: false }));
    }
    const exp = this.expanded();
    const out: TreeRow[] = [];
    const walk = (nodes: any[], depth: number) => {
      for (const n of nodes) {
        const kids = this.sortSiblings(n.children ?? []);
        out.push({ node: n, depth, hasChildren: kids.length > 0 });
        if (kids.length && exp.has(n.id)) walk(kids, depth + 1);
      }
    };
    walk(this.sortSiblings(this.treeRoots()).slice(start, start + pageSize), 0);
    return out;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTotal() / this.store.pagination().pageSize))
  );

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total   = this.totalPages();
    const current = this.store.pagination().page;
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadTree();
    this.loadCostCenters();
  }

  // ── Search ────────────────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  // ── Sort / Pagination ─────────────────────────────────────────────────────

  getSortState(col: keyof Account): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  selectedAccount: Account | null   = null;
  modalInitialMode: 'view' | 'edit' = 'view';
  isModalOpen  = false;
  modalLoading = false;

  openViewModal(item: Account): void {
    this.modalInitialMode = 'view';
    this._openModal(item);
  }

  openEditModal(item: Account): void {
    this.modalInitialMode = 'edit';
    this._openModal(item);
  }

  private _openModal(item: Account): void {
    this.modalLoading = true;
    this.svc.getById(item.id).subscribe({
      next: account => {
        this.selectedAccount = account;
        this.isModalOpen     = true;
        this.modalLoading    = false;
      },
      error: () => { this.modalLoading = false; },
    });
  }

  closeModal(): void {
    this.isModalOpen     = false;
    this.selectedAccount = null;
  }

  onSaved(): void {
    this.loadTree();
    this.closeModal();
  }

  // ── Export ────────────────────────────────────────────────────────────────

  readonly exporting = signal(false);

  onExport(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.svc.exportExcel().subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'plano-de-contas.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => { this.exporting.set(false); },
    });
  }

  // ── PC-03: importação por planilha ──────────────────────────────────────────
  readonly importing = signal(false);

  onTemplate(): void {
    this.svc.downloadImportTemplate().subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'modelo-plano-de-contas.xlsx';
        link.click(); URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.svc.importSpreadsheet(file).subscribe({
      next: (res) => {
        this.importing.set(false);
        input.value = '';
        alert(res?.message ?? 'Importação concluída.');
        this.loadTree();
      },
      error: (err) => {
        this.importing.set(false);
        input.value = '';
        alert(err?.error?.message ?? 'Falha ao importar a planilha.');
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  onDelete(id: number): void {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    this.svc.delete(id).subscribe({
      next: () => this.loadTree(),
      error: (err) => alert(err?.error?.message ?? 'Erro ao excluir conta.'),
    });
    this.closeModal();
  }
}
