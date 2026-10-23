// src/app/features/financial-transfers/financial-transfers-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { FinancialTransfersStore } from './financial-transfers.store';
import { FinancialTransfer, TransferStatus, TransferType, TransferView } from './financial-transfers.model';
import { RouterLink, ActivatedRoute, Router } from "@angular/router";

@Component({
  selector: 'app-financial-transfers-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [FinancialTransfersStore],
  templateUrl: './financial-transfers-list.page.html',
  styleUrl: './financial-transfers-list.page.scss',
})
export class FinancialTransfersListPage implements OnInit {
  readonly store = inject(FinancialTransfersStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // TR-03: visualização read-only da transferência.
  readonly viewItem = signal<FinancialTransfer | null>(null);
  openView(item: FinancialTransfer): void { this.viewItem.set(item); }
  closeView(): void { this.viewItem.set(null); }

  // TR-04: duplicar abre o formulário de nova transferência com os dados do registro.
  onDuplicate(item: FinancialTransfer): void {
    this.router.navigate(['/financial-transfers/new'], { state: { duplicate: item } });
  }

  ngOnInit(): void {
    // LB: ao voltar de salvar um lançamento avulso, mantém a visão Lançamentos (não cai em Transferências).
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view === 'entries') this.store.setView('ENTRIES');
    else this.store.load();
  }

  readonly viewOptions: { label: string; value: TransferView }[] = [
    { label: 'Transferências', value: 'TRANSFERS' },
    { label: 'Lançamentos', value: 'ENTRIES' },
  ];

  readonly statusOptions: { label: string; value: TransferStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Concluído', value: 'COMPLETED' },
    { label: 'Pendente', value: 'PENDING' },
  ];

  readonly typeOptions: { label: string; value: TransferType | '' }[] = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'PIX', value: 'PIX' },
    { label: 'TED', value: 'TED' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly isEntries = computed(() => this.store.filters().view === 'ENTRIES');
  readonly newRoute  = computed(() => this.isEntries() ? 'new-entry' : 'new');
  readonly newLabel  = computed(() => this.isEntries() ? 'Novo lançamento' : 'Nova transferência');

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

  getSortState(col: keyof FinancialTransfer): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  onDelete(item: FinancialTransfer) {
    if (!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
    this.store.deleteOne(item.id);
  }

  onDeleteSelected() {
    const n = this.store.selectedCount();
    if (!n) return;
    if (!confirm(`Excluir ${n} registro(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    this.store.deleteSelected();
  }

  /** Importa a planilha escolhida (conforme a visão atual) e limpa o input. */
  onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.store.importFile(file);
    input.value = '';
  }

  /** Exporta a lista filtrada atual para CSV (abre no Excel). */
  onExport() {
    const rows = this.store.sortedItems();
    if (!rows.length) { alert('Não há registros para exportar nesta visão.'); return; }
    const isEntries = this.isEntries();
    const header = isEntries
      ? ['Código', 'Descrição', 'Conta', 'Tipo', 'Data', 'Valor']
      : ['Código', 'Descrição', 'Origem', 'Destino', 'Data', 'Valor'];
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(';')];
    for (const r of rows) {
      lines.push([r.code, r.description, r.origin, r.destination, r.operationDate, r.value].map(esc).join(';'));
    }
    // BOM + CRLF para o Excel abrir com acentuação e separador corretos.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isEntries ? 'lancamentos' : 'transferencias'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}