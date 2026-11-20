// src/app/features/budgets/budgets-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { BudgetsStore } from './budgets.store';
import { BudgetsService, BudgetFile, BudgetImportResult } from './budgets.service';
import { NotificationService } from '../../shared/services/notification.service';
import { UploadService } from '../../shared/services/upload.service';
import { Budget, BudgetLine, BudgetTracking, BUDGET_STATUS_CONFIG } from './budgets.model';
import { RouterLink } from '@angular/router';
import { PopupShellComponent } from '../../shared/components/popup-shell/popup-shell.component';
import { PeriodFieldComponent } from '../../shared/components/period-field/period-field.component';
import { IconLegendComponent, IconLegendGroup } from '../../shared/components/icon-legend/icon-legend.component';

/** Card #768 (item 63): uma linha das abas Planejamento e Acompanhamento. */
interface LinhaRubrica { budget: Budget; linha: BudgetLine; periodos: number; porPeriodo: number; }

const MESES_POR_PERIODO: Record<string, number> = { Mensal: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12 };

@Component({
  selector: 'app-budgets-list',
  standalone: true,
  imports: [FormsModule, NgClass, CurrencyPipe, DatePipe, RouterLink, PopupShellComponent, PeriodFieldComponent, IconLegendComponent],
  providers: [BudgetsStore],
  templateUrl: './budgets-list.page.html',
  styleUrl: './budgets-list.page.scss',
})
export class BudgetsListPage implements OnInit {
  readonly store = inject(BudgetsStore);
  private svc = inject(BudgetsService);
  private notify = inject(NotificationService);
  private upload = inject(UploadService);
  readonly statusConfig = BUDGET_STATUS_CONFIG;

  // Botão Exportar estava sem ação.
  onExport(): void {
    this.svc.exportExcel().subscribe({
      next: b => this.baixar(b, `orcamentos_${new Date().toISOString().slice(0, 10)}.xlsx`),
      error: () => this.notify.error('Falha ao exportar.'),
    });
  }

  private baixar(b: Blob, nome: string): void {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit(): void {
    this.store.load();
  }

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

  // ── Card #768 (item 63): o que cada aba mostra ─────────────────────────────
  // Orçamentos: a lista. Planejamento: o previsto de cada rubrica, na ordem da
  // classificação, distribuído pela periodicidade. Acompanhamento: previsto ×
  // realizado × comprometido por rubrica. Antes as três abas mostravam a mesma tabela.
  readonly linhasRubrica = computed<LinhaRubrica[]>(() =>
    this.store.pageItems().flatMap(b => (b.tracking?.linhas ?? []).map(linha => {
      const periodos = this.periodos(b);
      return { budget: b, linha, periodos, porPeriodo: periodos ? Math.round((linha.previsto / periodos) * 100) / 100 : linha.previsto };
    })),
  );

  readonly totaisRubrica = computed(() => this.linhasRubrica().reduce((a, r) => ({
    previsto: a.previsto + r.linha.previsto,
    realizado: a.realizado + r.linha.realizado,
    comprometido: a.comprometido + (r.linha.comprometido ?? 0),
    saldo: a.saldo + r.linha.saldo,
  }), { previsto: 0, realizado: 0, comprometido: 0, saldo: 0 }));

  /** Quantos períodos da periodicidade cabem na vigência do orçamento. */
  periodos(b: Budget): number {
    if (!b.periodStart || !b.periodEnd) return 0;
    const [ai, mi] = b.periodStart.split('-').map(Number);
    const [af, mf] = b.periodEnd.split('-').map(Number);
    const meses = (af - ai) * 12 + (mf - mi) + 1;
    const passo = MESES_POR_PERIODO[b.periodicity] ?? 1;
    return Math.max(1, Math.ceil(meses / passo));
  }

  rotuloPeriodo(b: Budget): string {
    const passo = MESES_POR_PERIODO[b.periodicity];
    return passo === 1 ? 'mês' : passo === 12 ? 'ano' : (b.periodicity || 'período').toLowerCase();
  }

  // ── F2/F3: acompanhamento linha a linha ───────────────────────────────────
  readonly acompTarget = signal<Budget | null>(null);

  abrirAcompanhamento(item: Budget): void { this.acompTarget.set(item); }
  fecharAcompanhamento(): void { this.acompTarget.set(null); }

  /** Avisa quando ha rubrica que nao tem como receber gasto nenhum. */
  temLinhaSemClassificacao(t: BudgetTracking): boolean {
    return (t.linhas ?? []).some(l => l.semClassificacao);
  }

  onDelete(item: Budget) {
    if (!confirm('Excluir este orçamento? Esta ação não pode ser desfeita.')) return;
    this.verTarget.set(null);
    this.store.deleteOne(item.id);
  }

  // ── Card #768 (item 61): Visualizar, Anexar e Duplicar não respondiam ──────
  readonly verTarget = signal<Budget | null>(null);
  verAba: 'DADOS' | 'RUBRICAS' | 'ANEXOS' = 'DADOS';

  abrirVisualizar(item: Budget): void {
    this.verAba = 'DADOS';
    this.verTarget.set(item);
    this.carregarAnexos(item);
  }

  readonly anexoTarget = signal<Budget | null>(null);
  readonly anexos = signal<BudgetFile[]>([]);
  readonly enviando = signal(false);

  abrirAnexos(item: Budget): void {
    this.anexoTarget.set(item);
    this.carregarAnexos(item);
  }

  private carregarAnexos(item: Budget): void {
    this.anexos.set([]);
    this.svc.listFiles(Number(item.id)).subscribe({ next: l => this.anexos.set(l ?? []), error: () => this.anexos.set([]) });
  }

  nomeArquivo(f: BudgetFile): string {
    return f.description || decodeURIComponent((f.fileKey || f.fileUrl || '').split('/').pop() || `Anexo #${f.id}`);
  }

  onAnexoEscolhido(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const b = this.anexoTarget();
    input.value = '';
    if (!file || !b) return;
    this.enviando.set(true);
    this.upload.uploadOneFile(file).subscribe({
      next: f => this.svc.attachFile(Number(b.id), { fileUrl: f.fileUrl, fileKey: f.fileKey, description: file.name }).subscribe({
        next: () => { this.enviando.set(false); this.carregarAnexos(b); this.notify.success('Anexo adicionado ao orçamento.'); },
        error: err => { this.enviando.set(false); this.notify.error(err?.error?.message ?? 'Não foi possível anexar o arquivo.'); },
      }),
      error: () => { this.enviando.set(false); this.notify.error('Falha ao enviar o arquivo.'); },
    });
  }

  removerAnexo(f: BudgetFile): void {
    const b = this.anexoTarget() ?? this.verTarget();
    if (!b || !confirm('Remover este anexo do orçamento?')) return;
    this.svc.removeFile(Number(b.id), f.id).subscribe({
      next: () => { this.carregarAnexos(b); this.notify.success('Anexo removido.'); },
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível remover o anexo.'),
    });
  }

  onDuplicar(item: Budget): void {
    if (!confirm(`Duplicar o orçamento ${item.displayId} — ${item.title}? A cópia leva as rubricas e a classificação.`)) return;
    this.svc.copy(Number(item.id)).subscribe({
      next: c => { this.notify.success(`Orçamento duplicado: #${c.id} — ${c.title}.`); this.store.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível duplicar o orçamento.'),
    });
  }

  // ── Card #768 (item 62): Importar não tinha ação ──────────────────────────
  readonly menuImportar = signal(false);
  readonly resultadoImportacao = signal<BudgetImportResult | null>(null);

  onBaixarModelo(): void {
    this.svc.importTemplate().subscribe({
      next: b => this.baixar(b, 'modelo-orcamentos.xlsx'),
      error: () => this.notify.error('Não foi possível baixar o modelo.'),
    });
  }

  onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.svc.importar(file).subscribe({
      next: r => {
        this.resultadoImportacao.set(r);
        if (r.success) this.store.load();
      },
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível importar a planilha.'),
    });
  }

  readonly legenda: IconLegendGroup[] = [
    { title: 'Barra da lista', items: [
      { icon: 'calendar', name: 'Período', desc: 'Mostra os orçamentos cuja vigência cruza o período escolhido.' },
      { icon: 'excel', name: 'Exportar', desc: 'Baixa a lista de orçamentos em Excel.' },
      { icon: 'upload', name: 'Importar', desc: 'Baixa o modelo ou importa orçamentos de uma planilha.' },
    ] },
    { title: 'Ações do orçamento', items: [
      { icon: 'eye', name: 'Visualizar', desc: 'Abre os dados, as rubricas e os anexos do orçamento.' },
      { icon: 'chart', name: 'Acompanhar', desc: 'Previsto × realizado de cada rubrica.' },
      { icon: 'clip', name: 'Anexar', desc: 'Anexa ou remove arquivos do orçamento.' },
      { icon: 'copy', name: 'Duplicar', desc: 'Cria uma cópia do orçamento com as mesmas rubricas.' },
      { icon: 'trash', name: 'Excluir', desc: 'Exclui o orçamento.' },
    ] },
  ];
}
