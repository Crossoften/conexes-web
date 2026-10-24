// src/app/features/budgets/budgets-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, CurrencyPipe } from '@angular/common';
import { BudgetsStore } from './budgets.store';
import { BudgetsService } from './budgets.service';
import { NotificationService } from '../../shared/services/notification.service';
import { Budget, BudgetTracking, BUDGET_STATUS_CONFIG } from './budgets.model';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-budgets-list',
  standalone: true,
  imports: [FormsModule, NgClass, CurrencyPipe, RouterLink],
  providers: [BudgetsStore],
  templateUrl: './budgets-list.page.html',
  styleUrl: './budgets-list.page.scss',
})
export class BudgetsListPage implements OnInit {
  readonly store = inject(BudgetsStore);
  private svc = inject(BudgetsService);
  private notify = inject(NotificationService);
  readonly statusConfig = BUDGET_STATUS_CONFIG;

  // Botão Exportar estava sem ação.
  onExport(): void {
    this.svc.exportExcel().subscribe({
      next: b => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = url; a.download = `orcamentos_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Falha ao exportar.'),
    });
  }

  ngOnInit(): void {
    this.store.load();
  }

  readonly periodOptions = [
    { label: 'Selecione o período', value: '' },
    { label: 'Mensal', value: 'Mensal' },
    { label: 'Anual', value: 'Anual' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.store.filteredTotal() / this.store.pagination().pageSize)));

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total = this.totalPages();
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

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof Budget): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── F2/F3: acompanhamento linha a linha ───────────────────────────────────
  // A coluna "Acompanhamento" mostrava "N rubrica(s)" — contava linhas. O total
  // sozinho nao diz em que rubrica mexer, que e a pergunta de quem abre a tela.
  readonly acompTarget = signal<Budget | null>(null);

  abrirAcompanhamento(item: Budget): void { this.acompTarget.set(item); }
  fecharAcompanhamento(): void { this.acompTarget.set(null); }

  /** Avisa quando ha rubrica que nao tem como receber gasto nenhum. */
  temLinhaSemClassificacao(t: BudgetTracking): boolean {
    return (t.linhas ?? []).some(l => l.semClassificacao);
  }

  onDelete(item: Budget) {
    if (!confirm('Excluir este orçamento? Esta ação não pode ser desfeita.')) return;
    this.store.deleteOne(item.id);
  }
}