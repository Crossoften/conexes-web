// src/app/features/chart-of-accounts/chart-of-accounts-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AccountsStore } from './chart-of-accounts.store';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsDetailModalComponent } from './components/chart-of-accounts-detail.modal';
import { Account, AccountStatus, AccountType, ACCOUNT_STATUS_CONFIG, ACCOUNT_TYPE_LABELS } from './chart-of-accounts.model';

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

  readonly pageSizeOptions = [10, 25, 50, 100, 200, 500];

  // ── PC-02: visão em árvore (N níveis) ───────────────────────────────────────
  readonly viewMode   = signal<'list' | 'tree'>('list');
  readonly treeRoots  = signal<Account[]>([]);
  readonly treeLoading = signal(false);
  readonly collapsed  = signal<Set<number>>(new Set());

  toggleView(): void {
    const next = this.viewMode() === 'list' ? 'tree' : 'list';
    this.viewMode.set(next);
    if (next === 'tree' && this.treeRoots().length === 0) this.loadTree();
  }

  loadTree(): void {
    this.treeLoading.set(true);
    this.svc.tree().subscribe({
      next: (roots) => { this.treeRoots.set(roots ?? []); this.treeLoading.set(false); },
      error: () => { this.treeLoading.set(false); },
    });
  }

  hasChildren(n: any): boolean { return !!(n.children && n.children.length); }
  isCollapsed(id: number): boolean { return this.collapsed().has(id); }
  toggleNode(id: number): void {
    const s = new Set(this.collapsed());
    s.has(id) ? s.delete(id) : s.add(id);
    this.collapsed.set(s);
  }

  /** Achata a árvore respeitando os nós recolhidos, com profundidade para indentação. */
  readonly treeFlat = computed(() => {
    const out: { node: any; depth: number }[] = [];
    const walk = (nodes: any[], depth: number) => {
      for (const n of nodes) {
        out.push({ node: n, depth });
        if (this.hasChildren(n) && !this.isCollapsed(n.id)) walk(n.children, depth + 1);
      }
    };
    walk(this.treeRoots(), 0);
    return out;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.store.filteredTotal() / this.store.pagination().pageSize))
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
    this.store.load();
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

  trackById(_: number, item: Account): number { return item.id; }

  toStr(id: number): string { return String(id); }

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
    this.store.load();
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
        this.store.load();
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
    this.store.deleteById(id);
    this.closeModal();
  }
}