// src/app/features/accounts-payable/accounts-payable-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AccountsPayableStore } from './accounts-payable.store';
import { AccountsPayableService } from './accounts-payable.service';
import { PayableAccount, AdvancedFilters, FilterOption } from './accounts-payable.model';
import { PurchasesService } from '../purchases/purchases.service';
import { Router } from "@angular/router";
import { PopupShellComponent } from '../../shared/components/popup-shell/popup-shell.component';
import { PeriodFieldComponent } from '../../shared/components/period-field/period-field.component';
import { IconLegendComponent, IconLegendGroup } from '../../shared/components/icon-legend/icon-legend.component';
import { SearchSelectComponent, SearchOption } from '../../shared/components/search-select/search-select.component';
import { FinancialTitleFormComponent } from './form/financial-title-form.component';
import { FinancialTitleViewComponent } from './form/financial-title-view.component';
import { BaixaModalComponent, BaixaResult, BaixaParcela } from '../../shared/components/baixa-modal/baixa-modal.component';
import { RenegotiateModalComponent, RenegotiateResult } from '../../shared/components/renegotiate-modal/renegotiate-modal.component';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-accounts-payable-list',
  standalone: true,
  imports: [FormsModule, NgClass, BaixaModalComponent, RenegotiateModalComponent, PopupShellComponent, PeriodFieldComponent, IconLegendComponent, SearchSelectComponent, FinancialTitleFormComponent, FinancialTitleViewComponent],
  providers: [AccountsPayableStore],
  templateUrl: './accounts-payable-list.page.html',
  styleUrl: './accounts-payable-list.page.scss',
})
export class AccountsPayableListPage implements OnInit {
  readonly store = inject(AccountsPayableStore);
  private svc    = inject(AccountsPayableService);
  private lookups = inject(PurchasesService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  /** CP-09: contas bancárias para o seletor do modal de baixa. */
  readonly contasBancarias = signal<{ id: number; label: string }[]>([]);

  // ── CP-01: opções dos filtros da Busca Detalhada ──────────────────────────
  // Antes os 5 selects só tinham "Selecione" e os outros 9 campos eram caixas de
  // texto com placeholder "Selecione" — pareciam seletor e não eram.
  readonly optStatus      = this.svc.statusOptions;
  readonly optDateField   = this.svc.dateFieldOptions;
  readonly optRemittance  = this.svc.remittanceStatusOptions;
  readonly optPayment     = this.svc.paymentMethodOptions;
  readonly optSupplier    = signal<FilterOption[]>([]);
  // CP-01/I070: "Tipo Despesa" era o único campo de texto livre da Busca Detalhada.
  readonly optExpenseType = signal<FilterOption[]>([]);
  readonly optContract    = signal<FilterOption[]>([]);
  readonly optRequisition = signal<FilterOption[]>([]);
  readonly optBankAccount = signal<FilterOption[]>([]);
  readonly optAccountPlan = signal<FilterOption[]>([]);
  /** "Projeto/Centro de Custos" é um campo só para duas entidades — vão agrupadas. */
  readonly optCostCenter  = signal<FilterOption[]>([]);
  readonly optProject     = signal<FilterOption[]>([]);
  /** Subprojeto é o nível abaixo de Projeto: a atividade. */
  readonly optSubProject  = signal<FilterOption[]>([]);
  // Card #768 (item 46): centro de custo e projeto como filtros separados (sem prefixo).
  readonly optCostCenterId = signal<FilterOption[]>([]);
  readonly optProjectId    = signal<FilterOption[]>([]);
  /** Card #768 (item 46): fornecedor fixo na barra, com busca e lupa. */
  readonly optSupplierSearch = signal<SearchOption[]>([]);

  // Card #768 (cenário 35): legenda dos ícones.
  readonly legenda: IconLegendGroup[] = [
    { title: 'Barra de filtros', items: [
      { icon: 'filter', name: 'Filtros', desc: 'Abre os filtros adicionais: classificação, contrato, requisição e contas.' },
      { icon: 'R', name: 'Renegociar', desc: 'Renegocia o título selecionado.' },
      { icon: 'M', name: 'Multiplicar', desc: 'Divide o lançamento selecionado em lançamentos na lista.' },
      { icon: '➤', name: 'Remessa', desc: 'Envia os lançamentos selecionados para a remessa bancária.' },
      { icon: 'excel', name: 'Exportar Excel', desc: 'Exporta a lista, com os filtros aplicados, em Excel.' },
      { icon: 'XML', name: 'Importar XML', desc: 'Importa a nota fiscal em XML e cria a conta a pagar.' },
      { icon: 'upload', name: 'Upload de arquivo', desc: 'Envia um arquivo para importação.' },
      { icon: 'calendar', name: 'Período', desc: 'Todo o período, Este mês, Mês passado, Últimos 90 dias, Este ano ou o intervalo personalizado.' },
    ] },
    { title: 'Ações da linha (coluna fixa)', items: [
      { icon: 'eye', name: 'Visualizar', desc: 'Abre o título em pop-up, só para consulta.' },
      { icon: 'check', name: 'Baixar', desc: 'Registra o pagamento do título.' },
      { icon: 'edit', name: 'Editar', desc: 'Altera as informações do título.' },
      { icon: 'copy', name: 'Copiar', desc: 'Cria um novo título a partir deste.' },
      { icon: 'trash', name: 'Excluir', desc: 'Exclui o título, com confirmação.' },
    ] },
  ];

  brl(v: number | null | undefined): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0); }

  /** Card #768 (item 52): IRRF, PCC… com valor e vencimento, no título da linha. */
  textoRetencoes(item: PayableAccount): string {
    return item.retencoes.map(r => `${r.tipo}${r.codigo ? ' (' + r.codigo + ')' : ''}: ${this.brl(r.valor)} — vence ${r.vencimento}`).join('\n');
  }

  // ── Card #768 (itens 44 e 47): nova/editar em pop-up ───────────────────────
  readonly formAberto = signal<{ editId: number | null } | null>(null);
  readonly formLista = computed(() => { const f = this.formAberto(); return f ? [f] : []; });
  abrirNovo(): void { this.formAberto.set({ editId: null }); }
  fecharForm(): void { this.formAberto.set(null); }
  aoSalvarForm(editId: number | null): void {
    this.formAberto.set(null);
    this.notify.success(editId ? 'Conta a pagar atualizada.' : 'Conta a pagar cadastrada com sucesso.');
    this.store.load();
  }
  editarDaVisualizacao(p: PayableAccount): void { this.viewItem.set(null); this.onEdit(p); }
  excluirDaVisualizacao(p: PayableAccount): void { this.viewItem.set(null); this.onDelete(p); }

  // ── Card #768 (item 45): Renegociar, Multiplicar e Remessa na barra ────────
  private selecionados(): PayableAccount[] {
    const ids = this.store.selectedIds();
    return this.store.pageItems().filter(i => ids.has(i.id));
  }
  private umSelecionado(acao: string): PayableAccount | null {
    const sel = this.selecionados();
    if (sel.length !== 1) { this.notify.info(`Selecione um lançamento na lista para ${acao}.`); return null; }
    return sel[0];
  }
  barRenegociar(): void {
    const item = this.umSelecionado('renegociar');
    if (!item) return;
    if (!item.acoes.renegociar) { this.notify.error(`O ${item.displayId} não pode ser renegociado na situação ${item.status}.`); return; }
    this.openRenegotiate(item);
  }
  barMultiplicar(): void {
    const item = this.umSelecionado('multiplicar');
    if (!item) return;
    if (!item.acoes.multiplicar) { this.notify.error(`O ${item.displayId} não pode ser multiplicado (só título em aberto e sem baixa).`); return; }
    this.openMultiply(item);
  }
  barRemessa(): void {
    const sel = this.selecionados();
    if (!sel.length) { this.notify.info('Selecione os lançamentos que vão para a remessa.'); return; }
    const barrados = sel.filter(i => !i.acoes.remessa);
    if (barrados.length) { this.notify.error(`Não podem ir para a remessa: ${barrados.map(b => b.displayId).join(', ')} (só título em aberto).`); return; }
    this.store.sendSelectedToRemittance();
  }

  readonly temFiltroFixo = computed(() => {
    const f = this.store.filters();
    return !!(f.status || f.dateStart || f.dateEnd || f.supplier || this.store.activeFilterCount());
  });

  limparFiltrosPopup(): void {
    this.store.clearPopupFilters();
    this.localFilters = { ...this.store.filters() };
  }

  /** Carrega as listas dos filtros. Falha de uma não derruba as outras. */
  private carregarOpcoesDeFiltro(): void {
    const comoOpcao = (v: { id: number; name: string }[]): FilterOption[] =>
      v.map(r => ({ value: String(r.id), label: r.name }));

    this.lookups.getSuppliersLookup().subscribe({
      next: v => {
        this.optSupplier.set(comoOpcao(v as any));
        this.optSupplierSearch.set((v as any[]).map(r => ({ id: String(r.id), label: r.name })));
      },
      error: () => this.optSupplier.set([]),
    });
    this.lookups.getAccountPlansLookup().subscribe({
      next: v => this.optAccountPlan.set(comoOpcao(v as any)), error: () => this.optAccountPlan.set([]),
    });
    // CP-01/I070: o tipo de despesa é texto no título (não há cadastro próprio),
    // então as opções são os tipos realmente usados.
    this.svc.getExpenseTypes().subscribe({
      next: v => this.optExpenseType.set(v.map(t => ({ value: t, label: t }))),
      error: () => this.optExpenseType.set([]),
    });
    // Prefixo da entidade no valor: o back precisa saber se o id é de centro de
    // custo ou de projeto — id 12 de um não é id 12 do outro.
    // Só as analíticas: nenhum título pode ser rateado a uma conta sintética,
    // então oferecê-la seria mais uma opção que nunca devolve nada — que é
    // justamente o defeito que o CP-01 relata.
    this.lookups.getCostCentersLookup().subscribe({
      next: v => {
        this.optCostCenter.set(this.lookups.apenasAnaliticas(v).map(r => ({ value: `cc:${r.id}`, label: r.name })));
        this.optCostCenterId.set(this.lookups.apenasAnaliticas(v).map(r => ({ value: String(r.id), label: r.name })));
      },
      error: () => this.optCostCenter.set([]),
    });
    this.lookups.getProjectsLookup().subscribe({
      next: v => {
        this.optProject.set(this.lookups.apenasAnaliticas(v).map(r => ({ value: `pj:${r.id}`, label: r.name })));
        this.optProjectId.set(this.lookups.apenasAnaliticas(v).map(r => ({ value: String(r.id), label: r.name })));
      },
      error: () => this.optProject.set([]),
    });
    this.lookups.getActivitiesLookup().subscribe({
      next: v => this.optSubProject.set(comoOpcao(v as any)), error: () => this.optSubProject.set([]),
    });
    this.svc.getContracts('Pagar').subscribe({
      next: v => this.optContract.set(v.map(c => ({ value: String(c.id), label: c.label }))),
      error: () => this.optContract.set([]),
    });
    this.svc.getPurchaseRequests().subscribe({
      next: v => this.optRequisition.set(v), error: () => this.optRequisition.set([]),
    });
  }

  // FIN-01: baixa (pagamento) total ou parcial.
  readonly payItem = signal<PayableAccount | null>(null);
  readonly payBusy = signal(false);

  /** D6: as parcelas do título aberto, para a baixa poder mirar uma delas. */
  readonly payParcelas = signal<BaixaParcela[]>([]);

  openPay(item: PayableAccount): void {
    this.payItem.set(item);
    this.payParcelas.set([]);
    // D6: busca o detalhe para saber se o título tem parcelas.
    this.svc.getById(Number(item.id)).subscribe({
      next: (r: any) => this.payParcelas.set(
        (r.installments ?? []).map((p: any) => ({
          id: p.id,
          installment: p.installment,
          dueDate: p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—',
          amount: p.amount ?? 0,
          amountPaid: p.amountPaid ?? 0,
        })),
      ),
      error: () => this.payParcelas.set([]),
    });
  }

  // CP-03: visualização read-only do lançamento.
  readonly viewItem = signal<PayableAccount | null>(null);
  openView(item: PayableAccount): void { this.viewItem.set(item); }
  closeView(): void { this.viewItem.set(null); }

  // ── FIN-N6 / I101 (D5): comprovante e estorno controlado ──────────────────

  /** D5: o comprovante é o anexo gravado na baixa manual. */
  openComprovante(item: PayableAccount): void {
    this.svc.listFiles(Number(item.id)).subscribe({
      next: arquivos => {
        const comp = (arquivos ?? []).filter(a => /comprovante/i.test(a.description ?? ''));
        const alvo = comp.length ? comp : (arquivos ?? []);
        if (!alvo.length) {
          this.notify.info('Este título não tem comprovante anexado.');
          return;
        }
        // Abre o mais recente; os demais seguem acessíveis na aba Anexos do título.
        window.open(alvo[alvo.length - 1].fileUrl, '_blank', 'noopener');
      },
      error: e => this.notify.error(e?.error?.message ?? 'Não foi possível abrir o comprovante.'),
    });
  }

  /**
   * D5: estorno CONTROLADO — escolhe QUAL baixa desfazer e exige motivo.
   * Apagar a baixa sem motivo registrado é justamente o que "controlado" exclui.
   */
  readonly estornoItem  = signal<PayableAccount | null>(null);
  readonly estornoBaixas = signal<any[]>([]);
  readonly estornoBusy  = signal(false);
  estornoPaymentId = '';
  estornoMotivo = '';

  openEstorno(item: PayableAccount): void {
    this.estornoItem.set(item);
    this.estornoPaymentId = '';
    this.estornoMotivo = '';
    this.estornoBaixas.set([]);
    this.svc.getById(Number(item.id)).subscribe({
      next: (r: any) => {
        const pagamentos = r?.payments ?? [];
        this.estornoBaixas.set(pagamentos);
        if (pagamentos.length === 1) this.estornoPaymentId = String(pagamentos[0].id);
      },
      error: () => this.estornoBaixas.set([]),
    });
  }
  closeEstorno(): void { this.estornoItem.set(null); }

  confirmEstorno(): void {
    const item = this.estornoItem();
    if (!item || !this.estornoPaymentId || !this.estornoMotivo.trim()) return;
    this.estornoBusy.set(true);
    this.svc.reversePayment(Number(item.id), Number(this.estornoPaymentId), this.estornoMotivo.trim()).subscribe({
      next: (r: any) => {
        this.estornoBusy.set(false);
        this.closeEstorno();
        this.notify.success(r?.message ?? 'Baixa estornada.');
        this.store.load();
      },
      error: e => {
        this.estornoBusy.set(false);
        this.notify.error(e?.error?.message ?? 'Não foi possível estornar a baixa.');
      },
    });
  }

  rotuloDaBaixa(p: any): string {
    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const d = p?.paymentDate ? new Date(p.paymentDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
    return `#${p.id} · ${d} · ${brl.format(p.amount ?? 0)}${p.installmentId ? ' (parcela)' : ''}`;
  }
  closePay(): void { this.payItem.set(null); }

  onBaixaConfirm(r: BaixaResult): void {
    const item = this.payItem();
    if (!item) return;
    this.payBusy.set(true);
    // CP-09: a baixa leva juros, multa, desconto e conta bancária.
    this.svc.registerPayment(Number(item.id), {
      amount: r.amount, paymentDate: r.date, note: r.note,
      bankAccountId: r.bankAccountId, interest: r.interest, fine: r.fine, discount: r.discount,
      // D6: quando o usuário escolhe uma parcela, a baixa mira nela.
      installmentId: r.installmentId,
    }).subscribe({
      next: () => { this.payBusy.set(false); this.payItem.set(null); this.notify.success('Baixa registrada com sucesso.'); this.store.load(); },
      error: err => { this.payBusy.set(false); this.notify.error(err?.error?.message ?? 'Falha ao registrar a baixa.'); },
    });
  }

  // FIN-03: renegociação.
  readonly rngItem = signal<PayableAccount | null>(null);
  readonly rngBusy = signal(false);
  openRenegotiate(item: PayableAccount): void { this.rngItem.set(item); }
  closeRenegotiate(): void { this.rngItem.set(null); }
  onRenegotiateConfirm(r: RenegotiateResult): void {
    const item = this.rngItem();
    if (!item) return;
    this.rngBusy.set(true);
    this.svc.renegotiate(Number(item.id), r).subscribe({
      next: () => { this.rngBusy.set(false); this.rngItem.set(null); this.notify.success('Título renegociado — novo título gerado.'); this.store.load(); },
      error: err => { this.rngBusy.set(false); this.notify.error(err?.error?.message ?? 'Falha ao renegociar.'); },
    });
  }

  // ── I071 (CP-02): importação de XML de NF-e ────────────────────────────────
  // Os dois botões da barra ("Importar XML" e "Upload de arquivo") eram inertes:
  // não tinham handler nenhum e nenhum seletor de arquivo abria. Agora os dois
  // abrem o seletor, importam cada XML e mostram a leitura da nota (prévia), o
  // resultado e o erro legível, recarregando a lista com os títulos criados.
  readonly importBusy = signal(false);
  readonly importResultados = signal<{ arquivo: string; ok: boolean; mensagem: string; resumo: string }[]>([]);

  limparResultadoImport(): void { this.importResultados.set([]); }

  onImportXml(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    input.value = '';                       // permite reenviar o mesmo arquivo
    if (!arquivos.length) return;

    const dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const dia = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—');

    this.importBusy.set(true);
    this.importResultados.set([]);
    let pendentes = arquivos.length;
    const encerrar = () => {
      if (--pendentes === 0) {
        this.importBusy.set(false);
        this.store.load();                  // os registros importados aparecem na lista
      }
    };

    for (const arquivo of arquivos) {
      this.svc.importXml(arquivo).subscribe({
        next: res => {
          const n = res.nota;
          const resumo = n
            ? [
                `Nota ${n.numero}${n.serie ? '/' + n.serie : ''}`,
                `emitente ${n.emitenteNome || n.emitenteDoc}`,
                dinheiro.format(n.valor ?? 0),
                `emissão ${dia(n.emissao)}`,
                `vencimento ${dia(n.vencimento)}`,
                `${n.itens} item(ns)`,
                ...(n.chave ? [`chave ${n.chave}`] : []),
              ].join(' · ')
            : '';
          this.importResultados.update(l => [...l, { arquivo: arquivo.name, ok: res.criado, mensagem: res.mensagem, resumo }]);
          if (res.criado) this.notify.success(res.mensagem); else this.notify.error(res.mensagem);
          encerrar();
        },
        error: err => {
          const raw = err?.error?.message ?? 'Falha ao importar o XML.';
          const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
          this.importResultados.update(l => [...l, { arquivo: arquivo.name, ok: false, mensagem: msg, resumo: '' }]);
          this.notify.error(msg);
          encerrar();
        },
      });
    }
  }

  ngOnInit(): void {
    this.store.load();
    // CP-09: contas para o seletor da baixa. CP-01: as mesmas contas servem aos
    // filtros "Conta Pagadora" e "Conta Bancária Baixa".
    this.svc.getBankAccounts().subscribe({
      next: v => {
        this.contasBancarias.set(v);
        this.optBankAccount.set(v.map(c => ({ value: String(c.id), label: c.label })));
      },
      error: () => { this.contasBancarias.set([]); this.optBankAccount.set([]); },
    });
    this.carregarOpcoesDeFiltro();
  }

  /**
   * CP-10 / I077: a segunda opção se chamava "Visão 2" (valor "VISA0_2", com erro de
   * digitação) e não mudava nada — o seletor trocava o rótulo e mostrava a MESMA
   * tabela. Agora cada visão diz o que mostra e tem conteúdo próprio: uma linha por
   * título, ou uma linha por vencimento.
   */
  readonly viewOptions = [
    { label: 'Lançamentos (um por título)', value: 'LANCAMENTOS' },
    { label: 'Parcelas (uma por vencimento)', value: 'PARCELAS' },
  ];

  readonly ehVisaoParcelas = computed(() => this.store.view() === 'PARCELAS');

  /** CP-10/I077: expande cada título da página em suas parcelas. */
  readonly parcelaRows = computed(() =>
    this.store.pageItems().flatMap(t =>
      (t.installments ?? []).map(p => ({
        tituloId: t.id,
        displayId: t.displayId,
        company: t.company,
        history: t.history,
        rotulo: `${p.numero}/${t.installments.length}`,
        dueDate: p.dueDate,
        value: p.value,
        paid: p.paid,
        status: p.status,
      })),
    ),
  );

  readonly pageSizeOptions = [10, 25, 50];

  // Estado local para os inputs do modal antes de aplicar
  localFilters: AdvancedFilters = {
    issue: 'dueDate', status: '', dateStart: '', dateEnd: '', supplier: '', remittanceStatus: '',
    expenseType: '', paymentType: '', contract: '', requisition: '', writeOffAccount: '',
    payingAccount: '', categoryAccount: '', costCenter: '', subProject: '', project: '', activity: '',
  };

  /** CP-01: o intervalo precisa fechar — de depois de até não filtra nada. */
  get intervaloInvalido(): boolean {
    const { dateStart, dateEnd } = this.localFilters;
    return !!dateStart && !!dateEnd && dateStart > dateEnd;
  }

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

  openFilters() {
    this.localFilters = { ...this.store.filters() }; // Copia os filtros atuais
    this.store.toggleFilterModal(true);
  }

  closeFilters() {
    this.store.toggleFilterModal(false);
  }

  clearFilters() {
    this.store.clearFilters();
    this.localFilters = { ...this.store.filters() };
  }

  applyFilters() {
    if (this.intervaloInvalido) return;
    this.store.applyFilters({ ...this.localFilters });
  }

  getSortState(col: keyof PayableAccount): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── Ações de linha e em lote ────────────────────────────────────────────────

  onDelete(item: PayableAccount) {
    if (!confirm(`Excluir o lançamento ${item.displayId ?? item.id}? Esta ação não pode ser desfeita.`)) return;
    this.store.deleteOne(item.id);
  }

  onCopy(item: PayableAccount) {
    this.store.copyOne(item.id);
  }

  /** CP-04: abre o título no formulário, em modo edição — Card #768: em pop-up. */
  onEdit(item: PayableAccount) {
    this.formAberto.set({ editId: Number(item.id) });
  }

  onSendToRemittance(item: PayableAccount) {
    this.store.sendToRemittance(item.id);
  }

  /**
   * I101/D5: a conferência do título "Em análise". A matriz do servidor já dizia
   * `conferir: true` nessa situação e já barrava baixa e renegociação antes dela,
   * mas a linha não oferecia saída nenhuma — o título ficava parado sem botão.
   * São as duas únicas saídas: conferir (vira Em aberto) ou devolver com motivo.
   */
  readonly conferindo = signal<string | null>(null);

  onConferir(item: PayableAccount) {
    if (!confirm(`Conferir o lançamento ${item.displayId ?? item.id}? Ele passa de "Em análise" para "Em aberto" e aceita baixa.`)) return;
    this.conferindo.set(item.id);
    this.svc.conferir(Number(item.id)).subscribe({
      next: () => {
        this.conferindo.set(null);
        this.notify.success('Lançamento conferido — agora está Em aberto.');
        this.store.load();
      },
      error: e => {
        this.conferindo.set(null);
        this.notify.error(e?.error?.message ?? 'Não foi possível conferir o lançamento.');
      },
    });
  }

  onDevolver(item: PayableAccount) {
    const motivo = (prompt(`Devolver o lançamento ${item.displayId ?? item.id} ao Compras. Qual o motivo?`) ?? '').trim();
    if (!motivo) return;   // devolver sem motivo não ajuda quem recebe de volta
    this.conferindo.set(item.id);
    this.svc.devolver(Number(item.id), motivo).subscribe({
      next: () => {
        this.conferindo.set(null);
        this.notify.success('Lançamento devolvido ao Compras com o motivo registrado.');
        this.store.load();
      },
      error: e => {
        this.conferindo.set(null);
        this.notify.error(e?.error?.message ?? 'Não foi possível devolver o lançamento.');
      },
    });
  }

  onDeleteSelected() {
    const n = this.store.selectedCount();
    if (!n) return;
    if (!confirm(`Excluir ${n} lançamento(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    this.store.deleteSelected();
  }

  // Modal: multiplicar (gera parcelas)
  readonly multiplyTarget = signal<PayableAccount | null>(null);
  multiplyTimes = 2;
  multiplyInterval = 30;

  openMultiply(item: PayableAccount) {
    // CP-06: parcelar pede ao menos 2 — o critério fala em "quantidade de
    // parcelas e intervalo em dias".
    this.multiplyTimes = 2;
    this.multiplyInterval = 30;
    this.multiplyTarget.set(item);
  }

  /**
   * CP-06: a prévia do valor de cada parcela, em centavos, para quem confirma
   * ver o que vai acontecer. A última absorve a sobra da divisão — é a mesma
   * conta que o back faz, e mostrar uma diferente seria pior que não mostrar.
   */
  private previaCentavos(): { base: number; ultima: number } {
    const alvo = this.multiplyTarget();
    // `balanceNum` é o saldo; como o back recusa parcelar título que já tem
    // baixa, aqui ele é sempre o valor cheio.
    const total = Math.round((alvo?.balanceNum ?? 0) * 100);
    const n = Math.max(2, Math.floor(this.multiplyTimes || 2));
    const base = Math.floor(total / n);
    return { base, ultima: total - base * (n - 1) };
  }

  private brlDe(centavos: number): string {
    return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  previaParcela(): string { return this.brlDe(this.previaCentavos().base); }
  previaUltima(): string  { return this.brlDe(this.previaCentavos().ultima); }
  closeMultiply() { this.multiplyTarget.set(null); }
  confirmMultiply() {
    const item = this.multiplyTarget();
    if (!item) return;
    const times = Math.max(2, Math.floor(this.multiplyTimes));
    const interval = Math.max(1, Math.floor(this.multiplyInterval));
    this.store.multiplyOne(item.id, times, interval);
    this.closeMultiply();
  }

  // Modal: alterar vencimento em lote
  readonly bulkDateOpen = signal(false);
  bulkDate = '';

  openBulkDate() {
    if (!this.store.selectedCount()) return;
    this.bulkDate = '';
    this.bulkDateOpen.set(true);
  }
  closeBulkDate() { this.bulkDateOpen.set(false); }
  confirmBulkDate() {
    if (!this.bulkDate) return;
    this.store.bulkDueDate(this.bulkDate);
    this.closeBulkDate();
  }
}