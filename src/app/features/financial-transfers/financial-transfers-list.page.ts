// src/app/features/financial-transfers/financial-transfers-list.page.ts
import { Component, inject, computed, signal, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe } from '@angular/common';
import { FinancialTransfersStore } from './financial-transfers.store';
import { FinancialTransfersService } from './financial-transfers.service';
import { BankAccountOption, FinancialTransfer, ImportBatch, TransferView, NATUREZAS_RECURSO } from './financial-transfers.model';
import { ActivatedRoute } from "@angular/router";
import { NotificationService } from '../../shared/services/notification.service';
import { PopupShellComponent } from '../../shared/components/popup-shell/popup-shell.component';
import { PeriodFieldComponent } from '../../shared/components/period-field/period-field.component';
import { IconLegendComponent, IconLegendGroup } from '../../shared/components/icon-legend/icon-legend.component';
import { FinancialTransferNewPage } from './new/financial-transfer-new.page';
import { FinancialEntryNewPage } from './new-entry/financial-entry-new.page';
import { PurchasesService } from '../purchases/purchases.service';

@Component({
  selector: 'app-financial-transfers-list',
  standalone: true,
  imports: [FormsModule, NgClass, DatePipe, PopupShellComponent, PeriodFieldComponent, IconLegendComponent, FinancialTransferNewPage, FinancialEntryNewPage],
  providers: [FinancialTransfersStore],
  templateUrl: './financial-transfers-list.page.html',
  styleUrl: './financial-transfers-list.page.scss',
})
export class FinancialTransfersListPage implements OnInit {
  readonly store = inject(FinancialTransfersStore);
  private svc = inject(FinancialTransfersService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private lookups = inject(PurchasesService);

  // Card #768 (itens 34 e 36): menu do botão Importar (Baixar modelo / Importar arquivo).
  readonly menuImportar = signal(false);
  @HostListener('document:click', ['$event'])
  fecharMenus(ev: MouseEvent): void {
    if (this.menuImportar() && !(ev.target as HTMLElement)?.closest?.('.tool-menu')) this.menuImportar.set(false);
  }

  // Card #768 (cenários 20 e 23): legenda de cada ícone, abaixo da lista.
  readonly legenda: IconLegendGroup[] = [
    { title: 'Barra de filtros', items: [
      { icon: 'excel', name: 'Exportar', desc: 'Exporta a lista em Excel.' },
      { icon: 'pdf', name: 'Relatório PDF', desc: 'Gera o relatório da lista em PDF.' },
      { icon: 'history', name: 'Importações (lotes de upload)', desc: 'Mostra os arquivos importados e permite desfazer cada importação.' },
      { icon: 'upload', name: 'Importar', desc: 'Abre o menu com Baixar modelo e Importar arquivo.' },
      { icon: 'calendar', name: 'Período', desc: 'Todo o período, Este mês, Mês passado, Últimos 90 dias, Este ano ou o intervalo personalizado.' },
    ] },
    { title: 'Ações da linha (coluna fixa)', items: [
      { icon: 'eye', name: 'Visualizar', desc: 'Abre o registro em pop-up, só para consulta.' },
      { icon: 'edit', name: 'Editar', desc: 'Altera as informações.' },
      { icon: 'copy', name: 'Duplicar', desc: 'Cria um novo registro a partir deste.' },
      { icon: 'trash', name: 'Excluir', desc: 'Exclui o registro, com confirmação.' },
    ] },
  ];

  // Nomes das classificações para o rateio do pop-up de visualizar.
  private readonly nomesCategoria = signal(new Map<number, string>());
  private readonly nomesCentro = signal(new Map<number, string>());
  private readonly nomesProjeto = signal(new Map<number, string>());
  nomeCategoria(id?: number | null): string { return id ? (this.nomesCategoria().get(id) ?? `#${id}`) : '—'; }
  nomeCentro(id?: number | null): string { return id ? (this.nomesCentro().get(id) ?? `#${id}`) : '—'; }
  nomeProjeto(id?: number | null): string { return id ? (this.nomesProjeto().get(id) ?? `#${id}`) : '—'; }
  natureza(v?: string | null): string { return NATUREZAS_RECURSO.find(n => n.valor === v)?.rotulo ?? '—'; }
  brl(v?: number | null): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0); }
  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  // ── Card #768 (itens 30, 31, 35 e 36): formulário em pop-up ────────────────
  readonly formAberto = signal<{ titulo: string; editId: number | null; duplicate: any } | null>(null);
  readonly formLista = computed(() => { const f = this.formAberto(); return f ? [f] : []; });

  abrirNovo(): void {
    this.formAberto.set({ titulo: this.isEntries() ? 'Novo lançamento bancário' : 'Nova transferência', editId: null, duplicate: null });
  }
  abrirEdicao(item: FinancialTransfer): void {
    this.formAberto.set({ titulo: this.isEntries() ? 'Editar lançamento bancário' : 'Editar transferência', editId: Number(item.id), duplicate: null });
  }
  fecharForm(): void { this.formAberto.set(null); }
  aoSalvarForm(editId: number | null): void {
    this.formAberto.set(null);
    this.notify.success(editId ? 'Alterações salvas.' : (this.isEntries() ? 'Lançamento salvo.' : 'Transferência salva.'));
    this.store.load();
  }
  editarDaVisualizacao(t: FinancialTransfer): void {
    this.viewItem.set(null);
    this.abrirEdicao(t);
  }
  excluirDaVisualizacao(t: FinancialTransfer): void {
    if (!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
    this.viewItem.set(null);
    this.store.deleteOne(t.id);
  }

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
    this.formAberto.set({ titulo: 'Nova transferência', editId: null, duplicate: item });
  }

  // Card #768 (itens 31 e 36): o cliente pediu o lápis de Editar de volta, nas duas
  // visões (lista e pop-up de visualizar) — substitui a decisão LB-06 / I053.

  ngOnInit(): void {
    this.svc.getBankAccounts().subscribe({
      next: list => this.accounts.set(list),
      error: ()   => this.accounts.set([]),
    });
    const mapa = (v: any[]) => new Map<number, string>((v ?? []).map((x: any) => [Number(x.id), x.name]));
    this.lookups.getAccountPlansLookup().subscribe({ next: v => this.nomesCategoria.set(mapa(v as any[])) });
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.nomesCentro.set(mapa(v as any[])) });
    this.lookups.getProjectsLookup().subscribe({ next: v => this.nomesProjeto.set(new Map([...this.nomesProjeto(), ...mapa(v as any[])])) });
    this.lookups.getActivitiesLookup().subscribe({ next: v => this.nomesProjeto.set(new Map([...this.nomesProjeto(), ...mapa(v as any[])])) });
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