// src/app/features/financial-transfers/financial-transfers-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe } from '@angular/common';
import { FinancialTransfersStore } from './financial-transfers.store';
import { FinancialTransfersService } from './financial-transfers.service';
import { BankAccountOption, FinancialTransfer, ImportBatch, TransferView } from './financial-transfers.model';
import { RouterLink, ActivatedRoute, Router } from "@angular/router";
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-financial-transfers-list',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe, RouterLink],
  providers: [FinancialTransfersStore],
  templateUrl: './financial-transfers-list.page.html',
  styleUrl: './financial-transfers-list.page.scss',
})
export class FinancialTransfersListPage implements OnInit {
  readonly store = inject(FinancialTransfersStore);
  private svc = inject(FinancialTransfersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notify = inject(NotificationService);

  // TR-12 / LB-07: contas bancárias para os filtros de origem/destino/conta.
  readonly accounts = signal<BankAccountOption[]>([]);

  // TR-03: visualização read-only do registro.
  readonly viewItem = signal<FinancialTransfer | null>(null);
  openView(item: FinancialTransfer): void { this.viewItem.set(item); }
  closeView(): void { this.viewItem.set(null); }

  /**
   * TR-04: em Transferências, duplicar abre o formulário pré-preenchido.
   * LB-06 / B5: em Lançamentos, duplica no servidor (que leva a classificação
   * junto) e recarrega a lista — antes o botão nem aparecia nessa visão.
   */
  onDuplicate(item: FinancialTransfer): void {
    if (this.isEntries()) {
      this.store.duplicarLancamento(item.id);
      return;
    }
    this.router.navigate(['/financial-transfers/new'], { state: { duplicate: item } });
  }

  // LB-06 / I053: a ação "Editar" saiu da lista de Lançamentos — o pedido original
  // define o mesmo padrão das Transferências (visualizar, duplicar e excluir). A rota
  // /financial-transfers/entry/:id/edit continua registrada e o PATCH segue existindo;
  // apenas não há mais entrada por esta lista.

  ngOnInit(): void {
    this.svc.getBankAccounts().subscribe({
      next: list => this.accounts.set(list),
      error: ()   => this.accounts.set([]),
    });
    // LB: ao voltar de salvar um lançamento avulso, mantém a visão Lançamentos (não cai em Transferências).
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view === 'entries') this.store.setView('ENTRIES');
    else this.store.load();
  }

  readonly viewOptions: { label: string; value: TransferView }[] = [
    { label: 'Transferências', value: 'TRANSFERS' },
    { label: 'Lançamentos', value: 'ENTRIES' },
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

  // ── TR-14/LB-10: lotes de importação ──────────────────────────────────────
  // Depois de subir uma planilha errada não havia como voltar atrás senão
  // apagando registro a registro.
  readonly lotesAbertos = signal(false);
  readonly lotes = signal<ImportBatch[]>([]);
  readonly lotesCarregando = signal(false);

  abrirLotes(): void {
    this.lotesAbertos.set(true);
    this.carregarLotes();
  }
  fecharLotes(): void { this.lotesAbertos.set(false); }

  private carregarLotes(): void {
    this.lotesCarregando.set(true);
    this.svc.listImportBatches(this.store.filters().view).subscribe({
      next: r => { this.lotes.set(r.items); this.lotesCarregando.set(false); },
      error: () => { this.lotes.set([]); this.lotesCarregando.set(false); },
    });
  }

  desfazerLote(lote: ImportBatch): void {
    const quantos = lote.restantes;
    if (!confirm(
      `Desfazer esta importação remove ${quantos} registro(s) criado(s) pelo arquivo ` +
      `"${lote.fileName}". Nas transferências, os movimentos de extrato e o rateio saem junto, ` +
      `para o saldo das contas voltar ao que era. Esta ação não pode ser desfeita. Continuar?`,
    )) return;

    this.svc.deleteImportBatch(lote.id).subscribe({
      next: r => {
        const n = (r?.transferenciasRemovidas ?? 0) + (r?.lancamentosRemovidos ?? 0);
        this.notify.success(`Importação desfeita — ${n} registro(s) removido(s).`);
        this.carregarLotes();
        this.store.load();
      },
      error: err => this.notify.error(err?.error?.message ?? 'Falha ao desfazer a importação.'),
    });
  }

  // TR-13/LB-09: baixa o modelo conforme a visão aberta.
  onBaixarModelo(): void {
    const view = this.store.filters().view;
    this.svc.downloadTemplate(view).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = view === 'ENTRIES'
          ? 'modelo-lancamentos-bancarios.xlsx'
          : 'modelo-transferencias.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Falha ao baixar o modelo.'),
    });
  }

  /**
   * TR-10/TR-15/LB-11: relatório da visão aberta, em Excel ou PDF.
   *
   * Era um CSV montado aqui no navegador, com seis colunas — e na visão de
   * Lançamentos escrevia o cabeçalho de lançamentos preenchendo as células com
   * origem e destino, que são campos de transferência. Agora vem do servidor,
   * com todos os campos do formulário e os filtros da tela aplicados.
   */
  onExport(formato: 'excel' | 'pdf' = 'excel') {
    const f = this.store.filters();
    const filtros: Record<string, string> = {
      startDate: f.startDate ?? '',
      endDate: f.endDate ?? '',
      ...(this.isEntries()
        ? { bankAccountId: f.bankAccountId ?? '' }
        : { originAccountId: f.originAccountId ?? '', destinationAccountId: f.destinationAccountId ?? '' }),
    };

    this.svc.downloadReport(f.view, formato, filtros).subscribe({
      next: (blob: Blob) => {
        const base = this.isEntries() ? 'relatorio-lancamentos-bancarios' : 'relatorio-transferencias';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Falha ao gerar o relatório.'),
    });
  }
}