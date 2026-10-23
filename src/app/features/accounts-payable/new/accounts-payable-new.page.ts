// src/app/features/accounts-payable/new/accounts-payable-new.page.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { AccountsPayableService } from '../accounts-payable.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';

type MainTab = 'GERAIS' | 'RATEIO' | 'IMPOSTOS' | 'ANEXOS';
type SubTab = 'COMPETENCIA' | 'CLASSIFICACAO';
interface Ref { id: number; name: string; }

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

  // CP-04: o mesmo formulário serve para cadastrar e editar. Com id na rota,
  // carrega o título e envia PATCH em vez de POST.
  readonly editandoId = signal<number | null>(null);
  readonly ehEdicao = computed(() => this.editandoId() !== null);

  form: FormGroup;

  activeMainTab: MainTab = 'GERAIS';
  activeSubTab: SubTab = 'COMPETENCIA';
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

  anexos = [
    { id: 1, nome: 'Nota fiscal' },
    { id: 2, nome: 'Anexo 2' },
    { id: 3, nome: 'Anexo 3' }
  ];

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
      dataCadastro: [''],                          // → competencyDate (opcional)

      // -- Competência e dados de contrato (opcionais) --
      competencia: [''],
      codCompras: [''],
      contrato: [''],
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
  private readonly TAX_DEFS: { ctrl: string; type: string }[] = [
    { ctrl: 'aliqIRRF', type: 'IRRF' }, { ctrl: 'aliqPIS', type: 'PIS' },
    { ctrl: 'aliqPCC', type: 'PCC' }, { ctrl: 'aliqCOFINS', type: 'COFINS' },
    { ctrl: 'aliqINSS', type: 'INSS' }, { ctrl: 'aliqCSLL', type: 'CSLL' },
    { ctrl: 'aliqISS', type: 'ISS' }, { ctrl: 'aliqIBS', type: 'IBS' },
    { ctrl: 'aliqCBS', type: 'CBS' },
  ];
  readonly retencoesTotal = signal(0);
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  readonly retencoesTotalFmt = computed(() => this.brl.format(this.retencoesTotal()));

  private numOf(x: any): number {
    const n = Number(String(x ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
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
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.costCenters.set(v as Ref[]), error: () => {} });
    this.lookups.getProjectsLookup().subscribe({ next: v => this.projects.set(v as Ref[]), error: () => {} });

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
          dataCadastro:     iso(r.competencyDate),
          valorBruto:       brl(r.grossAmount),
          tipoDespesa:      r.expenseType ?? '',
          observacoes:      r.observation ?? '',
        });

        // CP-18: devolve as linhas de rateio gravadas.
        this.rateios.clear();
        for (const linha of r.rateios ?? []) {
          this.rateios.push(this.fb.group({
            costCenterId:  [linha.costCenterId  ? String(linha.costCenterId)  : ''],
            projectId:     [linha.projectId     ? String(linha.projectId)     : ''],
            accountPlanId: [linha.accountPlanId ? String(linha.accountPlanId) : ''],
            percentage:    [linha.percentage ?? ''],
          }));
        }

        // CP-22/23: devolve as alíquotas de retenção gravadas.
        for (const def of this.TAX_DEFS) {
          const imposto = (r.taxes ?? []).find((t: any) => t.taxType === def.type);
          if (imposto) this.form.get(def.ctrl)?.setValue(brl(imposto.rate));
        }
        this.recalcLiquido();
      },
      error: () => this.notify.error('Não foi possível carregar o título para edição.'),
    });
  }

  // ── CP-18 / D2: rateio multilinha ──────────────────────────────────────────
  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }

  adicionarRateio(): void {
    // A primeira linha já nasce com a classificação principal escolhida acima.
    const primeira = this.rateios.length === 0;
    this.rateios.push(this.fb.group({
      costCenterId:  [primeira ? (this.form.get('projetoCentroCusto')?.value ?? '') : ''],
      projectId:     [''],
      accountPlanId: [primeira ? (this.form.get('categoria')?.value ?? '') : ''],
      percentage:    [''],
    }));
  }

  removerRateio(i: number): void { this.rateios.removeAt(i); }

  somaPercentual(): number {
    return this.rateios.controls.reduce((s, c) => s + (Number(c.get('percentage')?.value) || 0), 0);
  }

  /** Valor em reais que cada linha representa sobre o líquido do título. */
  valorDaLinha(i: number): number {
    const bruto = this.form.get('valorLiquido')?.value || this.form.get('valorBruto')?.value || '';
    const total = Number(String(bruto).replace(/\./g, '').replace(',', '.')) || 0;
    const pct = Number(this.rateios.at(i).get('percentage')?.value) || 0;
    return Math.round(total * pct) / 100;
  }

  setMainTab(tab: MainTab) { this.activeMainTab = tab; }
  setSubTab(tab: SubTab) { this.activeSubTab = tab; }
  toggleParcelamento() { this.isParcelamentoOpen = !this.isParcelamentoOpen; }

  resetForm() {
    this.form.reset({ parcelar: 'Nao', definirValorVencimento: false });
    this.activeMainTab = 'GERAIS';
    this.activeSubTab = 'COMPETENCIA';
  }

  private buildPayload() {
    const v = this.form.getRawValue();
    const num = (x: any) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
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
    if (v.dataCadastro) payload.competencyDate = v.dataCadastro;
    if (v.observacoes) payload.observation = v.observacoes;

    // CP-18/D2: rateio multilinha. Quando o usuário não abre nenhuma linha mas
    // escolheu a classificação principal, mantém o comportamento anterior —
    // uma linha de 100% com essa classificação.
    if (this.rateios.length) {
      payload.rateios = this.rateios.controls.map(c => ({
        accountPlanId: c.get('accountPlanId')?.value ? Number(c.get('accountPlanId')!.value) : undefined,
        costCenterId:  c.get('costCenterId')?.value  ? Number(c.get('costCenterId')!.value)  : undefined,
        projectId:     c.get('projectId')?.value     ? Number(c.get('projectId')!.value)     : undefined,
        percentage:    Number(c.get('percentage')?.value) || 0,
      }));
    } else if (v.categoria || v.projetoCentroCusto) {
      payload.rateios = [{
        accountPlanId: v.categoria ? Number(v.categoria) : undefined,
        costCenterId: v.projetoCentroCusto ? Number(v.projetoCentroCusto) : undefined,
        percentage: 100,
        amount: num(v.valorLiquido),
      }];
    }

    // FIN-02: parcelamento — divide o título em N parcelas com vencimentos mensais,
    // preservando o valor total (a última parcela absorve o arredondamento).
    const nParcelas = Number(v.parcelas);
    if (v.parcelar === 'Sim' && nParcelas >= 2) {
      const total = num(v.valorLiquido) || num(v.valorBruto);
      payload.installments = this.buildInstallments(total, nParcelas, v.dataEmissao2);
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
      this.activeMainTab = 'GERAIS';
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