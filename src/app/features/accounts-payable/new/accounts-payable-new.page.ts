// src/app/features/accounts-payable/new/accounts-payable-new.page.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { AccountsPayableService } from '../accounts-payable.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { parseDecimalBR } from '../../../shared/utils/format';
import { UploadService } from '../../../shared/services/upload.service';

/**
 * CP-15/CP-24: as abas do formulário, em UMA linha só.
 *
 * A referência da página 26 do reteste 19/10 descreve o alvo: bloco "Dados
 * gerais" fixo no topo e, abaixo, as cinco abas lado a lado. O que havia era
 * "Dados do pagamento" com quatro abas e, DENTRO de "Dados gerais", mais duas —
 * abas dentro de abas, que é o que o relatório aponta.
 */
type MainTab = 'COMPETENCIA' | 'CLASSIFICACAO' | 'RATEIO' | 'IMPOSTOS' | 'ANEXOS';
interface Ref { id: number; name: string; }

/** CP-17: contrato com o que o formulário precisa preencher ao selecioná-lo. */
interface ContratoRef {
  id: number;
  label: string;
  value: number;
  balance: number;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-accounts-payable-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass, CurrencyMaskDirective, CurrencyPipe, DecimalPipe],
  templateUrl: './accounts-payable-new.page.html',
  styleUrl: './accounts-payable-new.page.scss',
})
export class AccountsPayableNewPage implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(AccountsPayableService);
  private lookups = inject(PurchasesService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private upload = inject(UploadService);

  // CP-04: o mesmo formulário serve para cadastrar e editar. Com id na rota,
  // carrega o título e envia PATCH em vez de POST.
  readonly editandoId = signal<number | null>(null);
  readonly ehEdicao = computed(() => this.editandoId() !== null);

  // CP-21 / I087: na edição, só reenviamos as parcelas (que o backend recria com
  // deleteMany+create) quando o usuário realmente mexe nelas. Senão preservamos as
  // parcelas e suas baixas já gravadas. Começa false e é marcado ao (re)gerar/editar.
  private installmentsTocadas = false;

  form: FormGroup;

  activeMainTab: MainTab = 'COMPETENCIA';
  isParcelamentoOpen = true;

  // FIN-02: opções de quantidade de parcelas (o select vinha vazio).
  readonly parcelaOptions = Array.from({ length: 23 }, (_, i) => i + 2); // 2..24
  saving = signal(false);

  // Lookups reais para os selects
  readonly suppliers    = signal<Ref[]>([]);
  readonly accountPlans = signal<Ref[]>([]);
  readonly costCenters  = signal<Ref[]>([]);
  // CP-18: o rateio multilinha classifica também por projeto/atividade.
  readonly projects     = signal<Ref[]>([]);
  // CP-14: serviços do cadastro central (separados do tipo de despesa).
  readonly services     = signal<Ref[]>([]);
  // CP-18: subprojetos para a coluna Subprojeto do rateio. Neste sistema o
  // subprojeto é o nível abaixo de projeto — o mesmo que a Busca Detalhada já
  // oferece no filtro "Subprojeto".
  readonly subProjects  = signal<Ref[]>([]);
  // CP-16: pedidos de compra, para vincular o código ao título.
  readonly orders       = signal<{ id: number; code: string; label: string }[]>([]);
  // CP-17: contratos, com valor, saldo e vigência.
  readonly contracts    = signal<ContratoRef[]>([]);

  // CP-24: anexos REAIS do título. Antes esta lista era fixa no código — três
  // cartões de exemplo com um Download que não baixava nada.
  readonly anexosDoTitulo = signal<{ id: number; fileUrl: string; fileKey?: string | null }[]>([]);
  readonly enviandoAnexo = signal(false);
  readonly erroAnexo     = signal<string | null>(null);

  private carregarAnexos(id: number): void {
    this.svc.listFiles(id).subscribe({
      next: a => this.anexosDoTitulo.set(a ?? []),
      error: () => this.anexosDoTitulo.set([]),
    });
  }

  nomeDoAnexo(a: { fileUrl: string; fileKey?: string | null }): string {
    const bruto = a.fileKey || a.fileUrl || '';
    try { return decodeURIComponent(bruto.split('/').pop() || 'arquivo'); } catch { return 'arquivo'; }
  }

  onAnexoSelecionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const id = this.editandoId();
    if (!file || !id) return;
    this.erroAnexo.set(null);
    this.enviandoAnexo.set(true);
    // o arquivo vai primeiro para o armazenamento (/upload/one-file) e só então
    // o link é amarrado ao título
    this.upload.uploadOneFile(file).subscribe({
      next: enviado => {
        this.svc.attachFile(id, { fileUrl: enviado.fileUrl, fileKey: enviado.fileKey }).subscribe({
          next: () => { this.enviandoAnexo.set(false); this.carregarAnexos(id); this.notify.success('Anexo adicionado.'); },
          error: e => { this.enviandoAnexo.set(false); this.erroAnexo.set(e?.error?.message ?? 'Erro ao vincular o anexo ao título.'); },
        });
      },
      error: e => {
        this.enviandoAnexo.set(false);
        this.erroAnexo.set(e?.error?.message ?? 'Erro ao enviar o arquivo. Verifique o armazenamento configurado.');
      },
    });
    input.value = '';
  }

  removerAnexo(fileId: number): void {
    const id = this.editandoId();
    if (!id) return;
    this.svc.removeFile(id, fileId).subscribe({
      next: () => this.carregarAnexos(id),
      error: e => this.erroAnexo.set(e?.error?.message ?? 'Erro ao remover o anexo.'),
    });
  }

  constructor() {
    this.form = this.fb.group({
      // -- Dados gerais (obrigatórios de verdade, conforme o contrato do back) --
      fornecedor: ['', Validators.required],
      historicoDespesa: ['', Validators.required],
      tipoDespesa: [''],
      dataEmissao1: ['', Validators.required],   // → issueDate
      dataEmissao2: ['', Validators.required],   // → dueDate
      valorBruto: ['', Validators.required],      // → grossAmount
      valorLiquido: ['', Validators.required],    // → netAmount
      dataCadastro: [''],                          // → registrationDate (do sistema, só exibe)

      // -- Competência e dados de contrato (opcionais) --
      competencia: [''],
      // CP-14: serviço do cadastro central, separado do tipo de despesa.
      servico: [''],
      // CP-16: pedido escolhido na pesquisa; `codCompras` passa a ser derivado dele.
      pedido: [''],
      codCompras: [{ value: '', disabled: true }],
      contrato: [''],
      // CP-24: campo da aba "Classificação do serviço e documento", que existia
      // com título e nenhum campo dentro.
      numeroDocumento: [''],
      valorContrato: [{ value: '', disabled: true }],
      saldoContrato: [{ value: '', disabled: true }],
      dataInicioContrato: [{ value: '', disabled: true }],
      dataFimContrato: [{ value: '', disabled: true }],

      // -- Rateio e parcelamento (opcionais) --
      // CP-18/D2: o rateio virou multilinha (era uma linha só, e o percentual
      // aceitava 1000). `categoria`/`projetoCentroCusto` seguem como a
      // classificação principal do título.
      categoria: [''],
      projetoCentroCusto: [''],
      subprojeto: [''],
      rateios: this.fb.array([]),

      parcelar: ['Nao'],
      parcelas: [''],
      // CP-20: as parcelas geradas ficam editáveis uma a uma (valor e vencimento).
      parcelasLista: this.fb.array([]),
      definirValorVencimento: [false],
      parcelaDetalhe: [{ value: '', disabled: true }],
      vencimentoDetalhe: [{ value: '', disabled: true }],
      valorDetalhe: [{ value: '', disabled: true }],

      // -- Impostos retidos (opcionais) -- (CP-23: + IBS e CBS)
      aliqIRRF: [''], codIRRF: [''],
      aliqPIS: [''], codPIS: [''],
      aliqPCC: [''], codPCC: [''],
      aliqCOFINS: [''], codCOFINS: [''],
      aliqINSS: [''], codINSS: [''],
      aliqCSLL: [''], codCSLL: [''],
      aliqISS: [''], codISS: [''],
      aliqIBS: [''], codIBS: [''],
      aliqCBS: [''], codCBS: [''],

      observacoes: ['']
    });
  }

  // CP-22/23: tipos de retenção que viram linhas de `taxes[]` (campo de alíquota → taxType).
  // CP-22: `code` é o controle do código de cada retenção — o template passou a
  // percorrer esta lista em vez de repetir nove blocos iguais à mão.
  readonly TAX_DEFS: { ctrl: string; type: string; code: string }[] = [
    { ctrl: 'aliqIRRF', type: 'IRRF', code: 'codIRRF' }, { ctrl: 'aliqPIS', type: 'PIS', code: 'codPIS' },
    { ctrl: 'aliqPCC', type: 'PCC', code: 'codPCC' }, { ctrl: 'aliqCOFINS', type: 'COFINS', code: 'codCOFINS' },
    { ctrl: 'aliqINSS', type: 'INSS', code: 'codINSS' }, { ctrl: 'aliqCSLL', type: 'CSLL', code: 'codCSLL' },
    { ctrl: 'aliqISS', type: 'ISS', code: 'codISS' }, { ctrl: 'aliqIBS', type: 'IBS', code: 'codIBS' },
    { ctrl: 'aliqCBS', type: 'CBS', code: 'codCBS' },
  ];
  readonly retencoesTotal = signal(0);
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  readonly retencoesTotalFmt = computed(() => this.brl.format(this.retencoesTotal()));

  /**
   * QA-01: um parser só, e que entenda o formato brasileiro de verdade.
   *
   * O anterior trocava a vírgula por ponto mas NÃO tirava o separador de
   * milhar: "1.234,56" virava "1.234.56", que é NaN — e NaN caía no zero logo
   * abaixo. Abrir um título de R$ 1.234,56 e salvar sem mexer em nada zerava o
   * valor. `parseDecimalBR` já existe no app e trata as três formas
   * ("1.234,56", "1234,56" e 1234.56).
   */
  private numOf(x: any): number {
    return parseDecimalBR(x);
  }
  private round2(n: number): number { return Math.round(n * 100) / 100; }

  /** CP-22/23: monta as retenções com o valor calculado sobre o valor bruto. */
  private buildTaxes(gross: number): { taxType: string; rate: number; amount: number }[] {
    return this.TAX_DEFS
      .map(d => ({ taxType: d.type, rate: this.numOf(this.form.get(d.ctrl)?.value) }))
      .filter(t => t.rate > 0)
      .map(t => ({ ...t, amount: this.round2(gross * t.rate / 100) }));
  }

  /** CP-12: valor líquido = valor bruto − retenções (calculado, não digitado). */
  private recalcLiquido(): void {
    const gross = this.numOf(this.form.get('valorBruto')?.value);
    const taxes = this.buildTaxes(gross);
    const total = this.round2(taxes.reduce((s, t) => s + t.amount, 0));
    this.retencoesTotal.set(total);
    this.form.get('valorLiquido')?.setValue(this.round2(gross - total), { emitEvent: false });
  }

  ngOnInit(): void {
    this.lookups.getSuppliersLookup().subscribe({ next: v => this.suppliers.set(v as Ref[]), error: () => {} });
    this.lookups.getAccountPlansLookup().subscribe({ next: v => this.accountPlans.set(v as Ref[]), error: () => {} });
    // CP-01 (achado): só conta ANALÍTICA aceita lançamento. Oferecer sintética
    // levava o usuário a preencher o formulário inteiro e levar 400 no Salvar.
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.costCenters.set(this.lookups.apenasAnaliticas(v) as Ref[]), error: () => {} });
    this.lookups.getProjectsLookup().subscribe({ next: v => this.projects.set(this.lookups.apenasAnaliticas(v) as Ref[]), error: () => {} });
    // CP-18: subprojetos (nível abaixo de projeto) para a coluna Subprojeto do rateio.
    this.lookups.getActivitiesLookup().subscribe({ next: v => this.subProjects.set(v as Ref[]), error: () => this.subProjects.set([]) });

    // CP-14: só os SERVIÇOS do cadastro central (produtos ficam de fora).
    this.lookups.getProductsServicesLookup().subscribe({
      next: v => this.services.set(
        (v as any[]).filter(x => String(x.type ?? '').toLowerCase().startsWith('serv'))
                    .map(x => ({ id: x.id, name: x.name })),
      ),
      error: () => this.services.set([]),
    });

    // CP-16: pedidos de compra para a pesquisa.
    this.svc.getPurchaseOrders().subscribe({ next: v => this.orders.set(v), error: () => this.orders.set([]) });

    // CP-17: contratos com valor, saldo e vigência.
    this.svc.getContracts().subscribe({ next: v => this.contracts.set(v), error: () => this.contracts.set([]) });

    // CP-13: a data de cadastro é do sistema — vem preenchida e não se edita.
    this.form.get('dataCadastro')?.setValue(new Date().toISOString().slice(0, 10));

    // CP-04: com id na rota, carrega o título para edição.
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) this.carregarParaEdicao(Number(id));

    // CP-12: recalcula o líquido quando muda o bruto ou qualquer alíquota de retenção.
    for (const c of ['valorBruto', ...this.TAX_DEFS.map(d => d.ctrl)]) {
      this.form.get(c)?.valueChanges.subscribe(() => this.recalcLiquido());
    }
  }

  /**
   * CP-04: carrega um título existente no formulário. Só os campos que a tela
   * edita — o que ela não mostra (parcelas já geradas, pagamentos, vínculos de
   * compras) não é tocado, porque o PATCH só envia o que vai no payload.
   */
  private carregarParaEdicao(id: number): void {
    this.svc.getById(id).subscribe({
      next: (r: any) => {
        this.editandoId.set(id);
        const iso = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
        const brl = (n?: number | null) =>
          n == null ? '' : Number(n).toFixed(2).replace('.', ',');

        this.form.patchValue({
          fornecedor:       r.stakeholderId ? String(r.stakeholderId) : '',
          historicoDespesa: r.history ?? r.description ?? '',
          dataEmissao1:     iso(r.issueDate),
          dataEmissao2:     iso(r.dueDate),
          // QA-01: a data de CADASTRO é a do sistema (registrationDate). Antes
          // carregava-se aqui a COMPETÊNCIA — a mesma troca de campos que o
          // CP-13 corrigiu na criação e que tinha ficado de pé na edição: a
          // competência aparecia no campo errado e o campo certo abria vazio.
          dataCadastro:     iso(r.registrationDate),
          competencia:      iso(r.competencyDate),
          // QA-01: valor como NÚMERO. A máscara (appCurrencyMask) é um
          // ControlValueAccessor que guarda número e formata sozinha; recebendo
          // a string "1234,56" ela fazia Number(...) = NaN e limpava o campo.
          valorBruto:       r.grossAmount ?? null,
          tipoDespesa:      r.expenseType ?? '',
          observacoes:      r.observation ?? '',
          // QA-01: vínculos. Não eram carregados — o contrato abria como
          // "Selecione" mesmo existindo, e bastava o usuário tocar no campo
          // para o título perder o vínculo ao salvar.
          servico:          r.serviceId ? String(r.serviceId) : '',
          pedido:           (r.orderId ?? r.purchaseOrderId) ? String(r.orderId ?? r.purchaseOrderId) : '',
          contrato:         r.contractId ? String(r.contractId) : '',
          codCompras:       r.orderCode ?? '',
        });
        // preenche valor/saldo/vigência do contrato carregado (CP-17)
        if (r.contractId) this.onContratoChange();
        // CP-24: anexos do título
        this.carregarAnexos(id);

        // CP-18: devolve as linhas de rateio gravadas.
        this.rateios.clear();
        for (const linha of r.rateios ?? []) {
          this.rateios.push(this.fb.group({
            costCenterId:  [linha.costCenterId  ? String(linha.costCenterId)  : ''],
            projectId:     [linha.projectId     ? String(linha.projectId)     : ''],
            subProjectId:  [linha.subProjectId  ? String(linha.subProjectId)  : ''],
            accountPlanId: [linha.accountPlanId ? String(linha.accountPlanId) : ''],
            percentage:    [linha.percentage ?? ''],
            amount:        [linha.amount != null ? this.brlDaLinha(linha.amount) : ''],
          }));
        }

        // CP-22/23: devolve as alíquotas de retenção gravadas.
        for (const def of this.TAX_DEFS) {
          const imposto = (r.taxes ?? []).find((t: any) => t.taxType === def.type);
          if (imposto) this.form.get(def.ctrl)?.setValue(brl(imposto.rate));
        }

        // CP-21 / I087: um título já parcelado reabre com Parcelar = Sim e as parcelas
        // gravadas na tabela — antes a tela carregava sempre "Não" e escondia as parcelas,
        // como se o parcelamento tivesse sumido. As parcelas só voltam no PATCH se o usuário
        // as regerar/editar (installmentsTocadas), para não apagar baixa nem saldo.
        this.parcelasLista.clear();
        this.installmentsTocadas = false;
        const parcelasGravadas = [...(r.installments ?? [])].sort(
          (a: any, b: any) => (a.installment ?? 0) - (b.installment ?? 0),
        );
        if (parcelasGravadas.length >= 2) {
          this.form.get('parcelar')?.setValue('Sim');
          this.form.get('parcelas')?.setValue(parcelasGravadas.length);
          for (const p of parcelasGravadas) {
            this.parcelasLista.push(this.fb.group({
              // CP-20/I086: o id da parcela viaja com a linha. É por ele que o
              // servidor casa a linha editada com a parcela existente e preserva
              // o que já foi pago nela e o vínculo da baixa — casar só pelo número
              // erraria assim que alguém renumerasse as parcelas.
              id: [p.id],
              installment: [p.installment],
              dueDate: [iso(p.dueDate)],
              amount: [p.amount],
            }));
          }
        } else {
          this.form.get('parcelar')?.setValue('Nao');
        }

        this.recalcLiquido();
      },
      error: () => this.notify.error('Não foi possível carregar o título para edição.'),
    });
  }

  /** CP-16: escolher o pedido preenche o código de compras (que era digitado à mão). */
  onPedidoChange(): void {
    const id = Number(this.form.get('pedido')?.value);
    const pedido = this.orders().find(o => o.id === id);
    this.form.get('codCompras')?.setValue(pedido ? pedido.code : '');
  }

  /** CP-17: escolher o contrato preenche valor, saldo e vigência. */
  onContratoChange(): void {
    const id = Number(this.form.get('contrato')?.value);
    const c = this.contracts().find(x => x.id === id);
    const brl = (n: number) => Number(n ?? 0).toFixed(2).replace('.', ',');
    const br = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '');

    this.form.patchValue({
      valorContrato: c ? brl(c.value) : '',
      saldoContrato: c ? brl(c.balance) : '',
      dataInicioContrato: c ? br(c.startDate) : '',
      dataFimContrato: c ? br(c.endDate) : '',
    });
  }

  /** CP-22: valor em reais de cada retenção, ao lado da alíquota. */
  valorDaRetencao(ctrl: string): number {
    const bruto = this.numOf(this.form.get('valorBruto')?.value);
    const aliquota = this.numOf(this.form.get(ctrl)?.value);
    return this.round2(bruto * aliquota / 100);
  }

  // ── CP-20: editor de parcelas ──────────────────────────────────────────────
  get parcelasLista(): FormArray { return this.form.get('parcelasLista') as FormArray; }

  /** Total do título (líquido, caindo para o bruto). */
  private totalDoTitulo(): number {
    const v = this.form.getRawValue();
    return this.numOf(v.valorLiquido) || this.numOf(v.valorBruto);
  }

  /**
   * CP-20: (re)gera as parcelas a partir da quantidade, com vencimentos mensais.
   * A última absorve o arredondamento, para a soma bater com o total.
   * Chamado quando muda a quantidade — depois disso o usuário edita à vontade.
   */
  gerarParcelas(): void {
    const n = Number(this.form.get('parcelas')?.value);
    // CP-21 / I087: o usuário pediu para (re)gerar — as parcelas vão no PATCH.
    this.installmentsTocadas = true;
    this.parcelasLista.clear();
    if (!n || n < 2) return;

    const total = this.totalDoTitulo();
    const primeira = this.form.get('dataEmissao2')?.value;
    for (const p of this.buildInstallments(total, n, primeira)) {
      this.parcelasLista.push(this.fb.group({
        installment: [p.installment],
        dueDate: [p.dueDate],
        amount: [p.amount],
      }));
    }
  }

  somaParcelas(): number {
    return this.round2(this.parcelasLista.controls.reduce((s, c) => s + (Number(c.get('amount')?.value) || 0), 0));
  }

  /** Diferença entre a soma das parcelas e o total do título. */
  diferencaParcelas(): number {
    return this.round2(this.somaParcelas() - this.totalDoTitulo());
  }

  /** Joga a diferença na última parcela, para fechar a soma. */
  ajustarUltimaParcela(): void {
    if (!this.parcelasLista.length) return;
    this.installmentsTocadas = true;
    const ultima = this.parcelasLista.at(this.parcelasLista.length - 1);
    const novo = this.round2((Number(ultima.get('amount')?.value) || 0) - this.diferencaParcelas());
    ultima.get('amount')?.setValue(novo);
  }

  // ── CP-18 / D2: rateio multilinha ──────────────────────────────────────────
  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }

  adicionarRateio(): void {
    // A primeira linha já nasce com a classificação principal escolhida acima.
    const primeira = this.rateios.length === 0;
    this.rateios.push(this.fb.group({
      costCenterId:  [primeira ? (this.form.get('projetoCentroCusto')?.value ?? '') : ''],
      projectId:     [''],
      // CP-18: subprojeto por linha
      subProjectId:  [''],
      accountPlanId: [primeira ? (this.form.get('categoria')?.value ?? '') : ''],
      percentage:    [''],
      // CP-18: o valor passa a ser EDITÁVEL — preencher um calcula o outro
      amount:        [''],
    }));
  }

  removerRateio(i: number): void { this.rateios.removeAt(i); }

  somaPercentual(): number {
    return this.rateios.controls.reduce((s, c) => s + (Number(c.get('percentage')?.value) || 0), 0);
  }

  /** Valor em reais que cada linha representa sobre o líquido do título. */
  valorDaLinha(i: number): number {
    const total = this.totalParaRateio();
    const pct = Number(this.rateios.at(i).get('percentage')?.value) || 0;
    return Math.round(total * pct) / 100;
  }

  /**
   * CP-18: "O percentual e o valor do rateio são proporcionais: ao preencher um,
   * o outro é calculado."
   *
   * Em centavos nas duas direções: `12000 * 33.33 / 100` em ponto flutuante
   * devolve 3999,5999999999995, e o valor apareceria errado no centavo.
   */
  private totalParaRateio(): number {
    const v = this.form.get('valorLiquido')?.value ?? this.form.get('valorBruto')?.value ?? 0;
    return parseDecimalBR(v);
  }

  private brlDaLinha(n: number): string {
    return (Number(n) || 0).toFixed(2).replace('.', ',');
  }

  /** Digitou o percentual → calcula o valor. */
  aoMudarPercentual(i: number): void {
    const linha = this.rateios.at(i);
    const totalCent = Math.round(this.totalParaRateio() * 100);
    const pct = Number(linha.get('percentage')?.value) || 0;
    const valorCent = Math.round((totalCent * pct) / 100);
    linha.get('amount')?.setValue(this.brlDaLinha(valorCent / 100), { emitEvent: false });
  }

  /** Digitou o valor → calcula o percentual. Era o caminho que faltava. */
  aoMudarValor(i: number): void {
    const linha = this.rateios.at(i);
    const totalCent = Math.round(this.totalParaRateio() * 100);
    const valorCent = Math.round(parseDecimalBR(linha.get('amount')?.value) * 100);
    const pct = totalCent > 0 ? Number(((valorCent / totalCent) * 100).toFixed(2)) : 0;
    linha.get('percentage')?.setValue(pct, { emitEvent: false });
  }

  setMainTab(tab: MainTab) { this.activeMainTab = tab; }
  toggleParcelamento() { this.isParcelamentoOpen = !this.isParcelamentoOpen; }

  resetForm() {
    this.form.reset({ parcelar: 'Nao', definirValorVencimento: false });
    this.activeMainTab = 'COMPETENCIA';
  }

  private buildPayload() {
    const v = this.form.getRawValue();
    // QA-01: era `Number(x)` cru. Com o campo mascarado guardando "1.234,56" ou
    // a edição injetando "1234,56", Number() devolvia NaN e o `: 0` zerava o
    // título no salvamento. Mesmo parser do resto da tela.
    const num = (x: any) => parseDecimalBR(x);
    const gross = num(v.valorBruto);
    // CP-22/23: retenções persistidas (eram descartadas). CP-12: líquido = bruto − retenções.
    const taxes = this.buildTaxes(gross);
    const totalRetido = this.round2(taxes.reduce((s, t) => s + t.amount, 0));
    const payload: any = {
      stakeholderId: Number(v.fornecedor),
      issueDate: v.dataEmissao1,
      dueDate: v.dataEmissao2,
      grossAmount: gross,
      netAmount: this.round2(gross - totalRetido),
      history: v.historicoDespesa,
      description: v.historicoDespesa,
    };
    if (taxes.length) payload.taxes = taxes;
    if (v.tipoDespesa) payload.expenseType = v.tipoDespesa;
    // CP-13: a data de CADASTRO é do sistema (registrationDate, default now()) e
    // não se envia. O que ia em competencyDate era a data de cadastro — troca
    // que deixava a competência, digitada na aba de contrato, ser descartada.
    if (v.competencia) payload.competencyDate = v.competencia;
    // CP-14: serviço do cadastro central, separado do tipo de despesa.
    if (v.servico) payload.serviceId = Number(v.servico);
    // CP-16: pedido vinculado por pesquisa; o código vem dele.
    if (v.pedido) {
      payload.orderId = Number(v.pedido);
      const pedido = this.orders().find(o => o.id === Number(v.pedido));
      if (pedido) payload.orderCode = pedido.code;
    }
    // CP-17: contrato vinculado.
    if (v.contrato) payload.contractId = Number(v.contrato);
    if (v.observacoes) payload.observation = v.observacoes;

    // CP-18/D2: rateio multilinha. Quando o usuário não abre nenhuma linha mas
    // escolheu a classificação principal, mantém o comportamento anterior —
    // uma linha de 100% com essa classificação.
    if (this.rateios.length) {
      payload.rateios = this.rateios.controls.map(c => ({
        accountPlanId: c.get('accountPlanId')?.value ? Number(c.get('accountPlanId')!.value) : undefined,
        costCenterId:  c.get('costCenterId')?.value  ? Number(c.get('costCenterId')!.value)  : undefined,
        projectId:     c.get('projectId')?.value     ? Number(c.get('projectId')!.value)     : undefined,
        // CP-18: subprojeto por linha e o valor digitado (o back fecha a conta
        // recíproca quando só um dos dois vier).
        subProjectId:  c.get('subProjectId')?.value  ? Number(c.get('subProjectId')!.value)  : undefined,
        percentage:    Number(c.get('percentage')?.value) || 0,
        amount:        parseDecimalBR(c.get('amount')?.value) || undefined,
      }));
    } else if (v.categoria || v.projetoCentroCusto) {
      payload.rateios = [{
        accountPlanId: v.categoria ? Number(v.categoria) : undefined,
        costCenterId: v.projetoCentroCusto ? Number(v.projetoCentroCusto) : undefined,
        percentage: 100,
        amount: num(v.valorLiquido),
      }];
    }

    // FIN-02 / CP-20: parcelamento. Se o usuário editou as parcelas na tabela,
    // manda exatamente o que ele deixou; senão, gera as N mensais na hora.
    const nParcelas = Number(v.parcelas);
    if (v.parcelar === 'Sim' && nParcelas >= 2) {
      const total = num(v.valorLiquido) || num(v.valorBruto);
      // CP-21/I087 + CP-20/I086: em edição só reenvia as parcelas se o usuário as
      // regerou ou editou uma linha. O servidor já não recria o parcelamento do
      // zero (ele casa linha a linha e preserva a baixa), mas continua não fazendo
      // sentido reenviar o que ninguém tocou.
      const reenviarParcelas = !this.ehEdicao() || this.installmentsTocadas || this.parcelasLista.dirty;
      if (reenviarParcelas) {
        payload.installments = this.parcelasLista.length
          ? this.parcelasLista.controls.map((c, i) => ({
              // CP-20/I086: o id identifica a parcela existente no servidor.
              id: c.get('id')?.value ?? undefined,
              installment: Number(c.get('installment')?.value) || i + 1,
              dueDate: c.get('dueDate')?.value,
              amount: Number(c.get('amount')?.value) || 0,
            }))
          : this.buildInstallments(total, nParcelas, v.dataEmissao2);
      }
    }
    return payload;
  }

  /** FIN-02: gera N parcelas dividindo o total, com vencimentos mensais a partir de `firstDueDate`. */
  private buildInstallments(total: number, n: number, firstDueDate: string): { installment: number; dueDate: string; amount: number }[] {
    const base = Math.floor((total / n) * 100) / 100;
    const start = firstDueDate ? new Date(firstDueDate) : new Date();
    const out: { installment: number; dueDate: string; amount: number }[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const amount = i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
      out.push({ installment: i + 1, dueDate: d.toISOString().slice(0, 10), amount });
    }
    return out;
  }

  onSubmit() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios (fornecedor, histórico, datas e valores).');
      // Se o campo pendente estiver em outra aba, volta para Dados gerais.
      this.activeMainTab = 'COMPETENCIA';
      return;
    }
    // CP-18/D2: a soma do rateio não pode passar de 100% (o backend recusa de novo).
    const soma = this.somaPercentual();
    if (this.rateios.length && Math.round(soma * 100) > 10000) {
      this.notify.error(`A soma dos percentuais do rateio é ${soma.toFixed(2)}% — não pode passar de 100%.`);
      this.activeMainTab = 'RATEIO';
      return;
    }
    this.saving.set(true);
    // CP-04: em edição, PATCH no título existente; senão, POST de um novo.
    const id = this.editandoId();
    const requisicao = id === null
      ? this.svc.create(this.buildPayload())
      : this.svc.update(id, this.buildPayload());

    requisicao.subscribe({
      next: () => {
        this.notify.success(id === null ? 'Conta a pagar cadastrada com sucesso.' : 'Conta a pagar atualizada.');
        this.router.navigate(['/accounts-payable']);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message;
        this.notify.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao cadastrar a conta a pagar.'));
      },
    });
  }
}