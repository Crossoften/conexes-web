// src/app/features/accounts-payable/form/financial-title-form.component.ts
import { Component, EventEmitter, HostBinding, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of, catchError, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AccountsPayableService } from '../accounts-payable.service';
import { AccountsReceivableService } from '../../accounts-receivable/accounts-receivable.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { UploadService } from '../../../shared/services/upload.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { SearchSelectComponent, SearchOption } from '../../../shared/components/search-select/search-select.component';
import { PopupShellComponent } from '../../../shared/components/popup-shell/popup-shell.component';
import { StakeholderNewPage } from '../../stakeholders/new/stakeholder-new.page';
import { parseDecimalBR } from '../../../shared/utils/format';
import { CODIGOS_IMPOSTO, IMPOSTOS, MEIOS_PAGAMENTO, TIPOS_DOCUMENTO, TIPOS_LANCAMENTO, TIPOS_PAGAMENTO } from './financial-title.constants';

export type TituloTipo = 'pagar' | 'receber';
type Aba = 'CONTRATO' | 'PAGAMENTO' | 'PARCELAMENTO' | 'IMPOSTOS' | 'ANEXOS';
interface Ref { id: number; name: string; parentProjectId?: number | null }
interface Contrato { id: number; label: string; value: number; balance: number; startDate: string; endDate: string }

/**
 * Card #768 (itens 47, 51, 53, 54 e 58 — cenários 41, 42, 46 e 47): o formulário
 * de Contas a pagar e o de Contas a receber passam a ser O MESMO, com o nome da
 * contraparte e os termos de cada lado. Dados gerais e a Classificação ficam no
 * alto; abaixo, as abas Pedido e contrato, Dados de pagamento, Parcelamento,
 * Impostos retidos e Anexos; no rodapé, Valor bruto, Retido, Líquido e Parcelas.
 * Abre em página ou em pop-up (embedded).
 */
@Component({
  selector: 'app-financial-title-form',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe, CurrencyMaskDirective, SearchSelectComponent, PopupShellComponent, StakeholderNewPage],
  templateUrl: './financial-title-form.component.html',
  styleUrl: './financial-title-form.component.scss',
})
export class FinancialTitleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private apSvc = inject(AccountsPayableService);
  private arSvc = inject(AccountsReceivableService);
  private lookups = inject(PurchasesService);
  private notify = inject(NotificationService);
  private upload = inject(UploadService);

  @Input() kind: TituloTipo = 'pagar';
  @Input() editId: number | null = null;
  @Input() embedded = false;
  /** Card #768 (item 39): aberto pela conciliação, com os dados do extrato. */
  @Input() doExtrato: { txId: number; bankAccountId: number; description: string; date: string; amount: number } | null = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();
  @HostBinding('class.is-embedded') get isEmbedded() { return this.embedded; }

  readonly tiposLancamento = TIPOS_LANCAMENTO;
  tiposDocumento = [...TIPOS_DOCUMENTO];
  readonly meios = MEIOS_PAGAMENTO;
  readonly tiposPagamento = TIPOS_PAGAMENTO;
  readonly impostos = IMPOSTOS;

  get pagar(): boolean { return this.kind === 'pagar'; }
  get contraparte(): string { return this.pagar ? 'Fornecedor' : 'Cliente'; }

  aba: Aba = 'CONTRATO';
  readonly saving = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  // ── listas ────────────────────────────────────────────────────────────────
  readonly pessoas = signal<SearchOption[]>([]);
  private documentos = new Map<number, string>();
  readonly pedidos = signal<SearchOption[]>([]);
  private codigoDoPedido = new Map<number, string>();
  readonly contratos = signal<Contrato[]>([]);
  readonly contratoOpts = computed<SearchOption[]>(() => this.contratos().map(c => ({
    id: c.id, label: c.label,
    sublabel: `Valor ${this.brl(c.value)} · saldo ${this.brl(c.balance)}${c.endDate ? ' · até ' + this.dataBR(c.endDate) : ''}`,
  })));
  readonly termos = signal<Ref[]>([]);
  readonly servicos = signal<Ref[]>([]);
  readonly contas = signal<{ id: number; label: string }[]>([]);
  readonly planos = signal<Ref[]>([]);
  readonly centros = signal<Ref[]>([]);
  readonly projetos = signal<Ref[]>([]);
  readonly atividades = signal<Ref[]>([]);

  readonly editandoId = signal<number | null>(null);
  readonly ehEdicao = computed(() => this.editandoId() !== null);
  private parcelasTocadas = false;
  private statusAtual = 'Open';

  form: FormGroup = this.fb.group({
    // Dados gerais
    stakeholderId: ['', Validators.required],
    historico: ['', Validators.required],
    tipo: [''],                                 // tipo de despesa / de receita
    tipoLancamento: ['Real', Validators.required],
    tipoDocumento: ['', Validators.required],
    numeroDocumento: [''],
    competencia: ['', Validators.required],
    dataCadastro: [{ value: new Date().toISOString().slice(0, 10), disabled: true }],
    dataEmissao: ['', Validators.required],
    vencimento: ['', Validators.required],
    valorBruto: [null as number | null, Validators.required],
    // Classificação e rateio
    rateios: this.fb.array([]),
    // Pedido e contrato
    pedido: [''],
    codCompras: [{ value: '', disabled: true }],
    contrato: [''],
    servico: [''],
    termo: [''],
    situacao: ['Open'],
    // Dados de pagamento / recebimento
    meio: ['', Validators.required],
    tipoPagamento: [''],
    conta: [''],
    codigoBarras: [''],
    nossoNumero: [''],
    // Parcelamento
    parcelar: ['Nao'],
    qtdParcelas: [2],
    parcelas: this.fb.array([]),
    // Impostos retidos
    edicaoManual: [false],
    impostos: this.fb.array(IMPOSTOS.map(t => this.fb.group({ taxType: [t], rate: [''], code: [''], amount: [null as number | null] }))),
    observacoes: [''],
  });

  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }
  get parcelas(): FormArray { return this.form.get('parcelas') as FormArray; }
  get impostosArr(): FormArray { return this.form.get('impostos') as FormArray; }

  codigosDe(tipo: string): string[] | 'livre' { return CODIGOS_IMPOSTO[tipo] ?? []; }
  ehLivre(tipo: string): boolean { return CODIGOS_IMPOSTO[tipo] === 'livre'; }
  codigosLista(tipo: string): string[] { const c = CODIGOS_IMPOSTO[tipo]; return Array.isArray(c) ? c : []; }

  // ── valores ───────────────────────────────────────────────────────────────
  private n(x: any): number { return typeof x === 'number' ? x : parseDecimalBR(x); }
  private r2(v: number): number { return Math.round(v * 100) / 100; }
  brl(v: number | null | undefined): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0); }
  dataBR(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  bruto(): number { return this.n(this.form.get('valorBruto')?.value) || 0; }

  /** Valor retido de cada imposto: calculado (bruto × alíquota) ou digitado na edição manual. */
  retidoDe(i: number): number {
    const g = this.impostosArr.at(i);
    if (this.form.get('edicaoManual')?.value) return this.r2(this.n(g.get('amount')?.value) || 0);
    return this.r2(this.bruto() * (this.n(g.get('rate')?.value) || 0) / 100);
  }
  retido(): number { return this.r2(this.impostosArr.controls.reduce((s, _, i) => s + this.retidoDe(i), 0)); }
  liquido(): number { return this.r2(this.bruto() - this.retido()); }
  somaParcelas(): number { return this.r2(this.parcelas.controls.reduce((s, c) => s + (this.n(c.get('amount')?.value) || 0), 0)); }
  qtdParcelasResumo(): number { return this.form.get('parcelar')?.value === 'Sim' && this.parcelas.length ? this.parcelas.length : 1; }

  /** Ligar a edição manual parte do que estava calculado. */
  onEdicaoManual(): void {
    const manual = !!this.form.get('edicaoManual')?.value;
    this.impostosArr.controls.forEach((g, i) => {
      if (manual) g.get('amount')?.setValue(this.r2(this.bruto() * (this.n(g.get('rate')?.value) || 0) / 100), { emitEvent: false });
    });
  }

  // ── rateio: Categoria, Centro de custo, Projeto, Atividade e % ─────────────
  novaLinha(v: any = {}): FormGroup {
    const s = (x: any) => (x ? String(x) : '');
    return this.fb.group({
      accountPlanId: [s(v.accountPlanId), Validators.required],
      costCenterId: [s(v.costCenterId), Validators.required],
      projectId: [s(v.projectId)],
      activityId: [s(v.subProjectId ?? v.activityId)],
      percentage: [v.percentage ?? (this.rateios?.length ? '' : 100), Validators.required],
    });
  }
  adicionarRateio(): void { this.rateios.push(this.novaLinha()); }
  removerRateio(i: number): void { if (this.rateios.length > 1) this.rateios.removeAt(i); }
  somaPercentual(): number { return this.r2(this.rateios.controls.reduce((s, c) => s + (Number(c.get('percentage')?.value) || 0), 0)); }
  valorDaLinha(i: number): number { return this.r2(this.liquido() * (Number(this.rateios.at(i).get('percentage')?.value) || 0) / 100); }
  atividadesDaLinha(i: number): Ref[] {
    const p = Number(this.rateios.at(i)?.get('projectId')?.value) || null;
    const todas = this.atividades();
    if (!p) return todas;
    const doProjeto = todas.filter(a => a.parentProjectId === p);
    return doProjeto.length ? doProjeto : todas;
  }

  // ── parcelamento ──────────────────────────────────────────────────────────
  setParcelar(v: 'Sim' | 'Nao'): void {
    this.form.get('parcelar')?.setValue(v);
    this.parcelasTocadas = true;
    if (v === 'Sim' && !this.parcelas.length) this.gerarParcelas();
    if (v === 'Nao') this.parcelas.clear();
  }

  /** Divide o líquido (o que se paga/recebe) em N, com vencimentos mensais a partir do vencimento. */
  gerarParcelas(): void {
    const n = Math.max(2, Math.floor(Number(this.form.get('qtdParcelas')?.value) || 2));
    this.parcelasTocadas = true;
    this.parcelas.clear();
    const totalC = Math.round(this.liquido() * 100);
    const base = Math.floor(totalC / n);
    const inicio = this.form.get('vencimento')?.value || new Date().toISOString().slice(0, 10);
    for (let i = 0; i < n; i++) {
      const d = new Date(inicio + 'T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + i);
      this.parcelas.push(this.fb.group({
        id: [null],
        installment: [i + 1],
        dueDate: [d.toISOString().slice(0, 10)],
        amount: [(i === n - 1 ? totalC - base * (n - 1) : base) / 100],
      }));
    }
  }

  // ── abrir o calendário ao clicar ──────────────────────────────────────────
  calendario(ev: Event): void {
    const el = ev.target as HTMLInputElement & { showPicker?: () => void };
    try { el.showPicker?.(); } catch { /* sem showPicker */ }
  }

  // ── cadastro de fornecedor/cliente em pop-up ──────────────────────────────
  readonly cadastroPessoa = signal(false);
  onPessoaCriada(s: any): void {
    this.cadastroPessoa.set(false);
    this.carregarPessoas(() => {
      if (s?.id != null) this.form.get('stakeholderId')?.setValue(String(s.id));
    });
    this.notify.success(`${this.contraparte} cadastrado e selecionado.`);
  }

  documentoDaPessoa(): string {
    const id = Number(this.form.get('stakeholderId')?.value);
    return id ? (this.documentos.get(id) ?? '') : '';
  }

  // ── carga ─────────────────────────────────────────────────────────────────
  private carregarPessoas(depois?: () => void): void {
    this.http.get<any>(`${environment.apiUrl}/v1/stakeholders`, { params: new HttpParams().set('take', 2000) }).subscribe({
      next: res => {
        const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.documentos = new Map(rows.map(r => [Number(r.id), r.document ?? '']));
        this.pessoas.set(rows.map(r => ({
          id: Number(r.id), label: r.name ?? r.tradeName ?? `#${r.id}`,
          sublabel: [r.document, r.tradeName && r.tradeName !== r.name ? r.tradeName : null].filter(Boolean).join(' · ') || undefined,
        })));
        depois?.();
      },
      error: () => this.pessoas.set([]),
    });
  }

  ngOnInit(): void {
    if (this.rateios.length === 0) this.rateios.push(this.novaLinha());
    if (!this.pagar) {
      // em receber, o tipo de pagamento é a forma de recebimento — opcional como antes
      this.form.get('meio')?.clearValidators();
      this.form.get('meio')?.updateValueAndValidity();
    }
    this.carregarPessoas();
    const lista = (path: string, params: Record<string, any> = {}) =>
      this.http.get<any>(`${environment.apiUrl}${path}`, { params: new HttpParams({ fromObject: { take: 500, ...params } }) })
        .pipe(map(r => (Array.isArray(r) ? r : (r?.data ?? [])) as any[]), catchError(() => of([] as any[])));

    // contratos da natureza do formulário (item 57)
    lista('/v1/purchases/contracts', { nature: this.pagar ? 'Pagar' : 'Receber' }).subscribe(rows => this.contratos.set(rows.map(c => ({
      id: Number(c.id), label: [c.number, c.title].filter(Boolean).join(' — ') || `Contrato #${c.id}`,
      value: Number(c.value ?? 0), balance: Number(c.balanceValue ?? c.value ?? 0), startDate: c.startDate ?? '', endDate: c.endDate ?? '',
    }))));
    if (this.pagar) {
      lista('/v1/purchases/orders').subscribe(rows => {
        this.codigoDoPedido = new Map(rows.map(o => [Number(o.id), o.orderCode ?? `PED-${String(o.id).padStart(4, '0')}`]));
        this.pedidos.set(rows.map(o => ({
          id: Number(o.id),
          label: `#${o.id} — ${o.supplier?.name ?? 'Fornecedor #' + o.supplierId}`,
          sublabel: `Pedido ${o.orderCode ?? 'PED-' + String(o.id).padStart(4, '0')} · ${this.brl(o.totalValue ?? 0)}${o.createdAt ? ' · ' + this.dataBR(o.createdAt) : ''}`,
        })));
      });
    } else {
      lista('/v1/partnerships').subscribe(rows => this.termos.set(rows.map(t => ({
        id: Number(t.id), name: [t.termNumber ?? t.number, t.title ?? t.name].filter(Boolean).join(' — ') || `Termo #${t.id}`,
      }))));
    }
    this.apSvc.getBankAccounts().subscribe({ next: v => this.contas.set(v), error: () => this.contas.set([]) });
    this.lookups.getProductsServicesLookup().subscribe({
      next: v => this.servicos.set((v as any[]).filter(x => !x.type || String(x.type).toLowerCase().startsWith('serv')).map(x => ({ id: x.id, name: x.name }))),
      error: () => this.servicos.set([]),
    });
    this.lookups.getAccountPlansLookup().subscribe({ next: v => this.planos.set(v as Ref[]), error: () => {} });
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.centros.set(this.lookups.apenasAnaliticas(v) as Ref[]), error: () => {} });
    this.lookups.getProjectsLookup().subscribe({ next: v => this.projetos.set(this.lookups.apenasAnaliticas(v) as Ref[]), error: () => {} });
    this.lookups.getActivitiesLookup().subscribe({ next: v => this.atividades.set(v as Ref[]), error: () => {} });

    if (this.editId) { this.carregar(this.editId); return; }

    const ext = this.doExtrato;
    if (ext) {
      const dia = (ext.date ?? '').slice(0, 10);
      // Card #768 (item 39): a conta do extrato vira a conta pagadora/recebedora do título.
      this.form.patchValue({ historico: ext.description ?? '', dataEmissao: dia, vencimento: dia, competencia: dia, valorBruto: Math.abs(Number(ext.amount ?? 0)),
        conta: ext.bankAccountId ? String(ext.bankAccountId) : '' });
    }
  }

  private carregar(id: number): void {
    const req = this.pagar ? this.apSvc.getById(id) : this.arSvc.getById(id);
    (req as any).subscribe({
      next: (r: any) => {
        this.editandoId.set(id);
        this.statusAtual = r.status ?? 'Open';
        const dia = (d?: string | null) => (d ? String(d).slice(0, 10) : '');
        this.form.patchValue({
          stakeholderId: r.stakeholderId ? String(r.stakeholderId) : '',
          historico: this.pagar ? (r.history ?? r.description ?? '') : (r.description ?? ''),
          tipo: this.pagar ? (r.expenseType ?? '') : (r.revenueType ?? ''),
          tipoLancamento: r.entryKind ?? 'Real',
          tipoDocumento: r.type ?? '',
          numeroDocumento: r.document ?? '',
          competencia: dia(r.competencyDate),
          dataCadastro: dia(r.registrationDate ?? r.createdAt),
          dataEmissao: dia(r.issueDate),
          vencimento: dia(r.dueDate),
          valorBruto: this.pagar ? (r.grossAmount ?? null) : (r.amount ?? null),
          pedido: r.orderId ? String(r.orderId) : '',
          codCompras: r.orderCode ?? '',
          contrato: r.contractId ? String(r.contractId) : '',
          servico: r.serviceId ? String(r.serviceId) : '',
          termo: r.partnershipId ? String(r.partnershipId) : '',
          situacao: r.status ?? 'Open',
          meio: r.paymentMeans ?? '',
          tipoPagamento: (this.pagar ? r.paymentMethod : r.receiptMethod) ?? '',
          conta: (this.pagar ? r.bankAccountId : r.receivingBankAccountId) ? String(this.pagar ? r.bankAccountId : r.receivingBankAccountId) : '',
          codigoBarras: r.barcode ?? '',
          nossoNumero: r.ourNumber ?? '',
          edicaoManual: !!r.manualTaxEdit,
          observacoes: r.observation ?? '',
        });
        // o tipo de documento antigo, fora da lista, continua aparecendo
        if (r.type && !this.tiposDocumento.some(t => t.valor === r.type)) this.tiposDocumento = [...this.tiposDocumento, { valor: r.type, rotulo: r.type }];
        this.rateios.clear();
        for (const l of r.rateios ?? []) this.rateios.push(this.novaLinha(l));
        if (!this.rateios.length) this.rateios.push(this.novaLinha());
        this.impostosArr.controls.forEach(g => {
          const t = (r.taxes ?? []).find((x: any) => x.taxType === g.get('taxType')?.value);
          g.patchValue({ rate: t ? String(t.rate).replace('.', ',') : '', code: t?.code ?? '', amount: t ? t.amount : null });
        });
        const ps = [...(r.installments ?? [])].sort((a: any, b: any) => (a.installment ?? 0) - (b.installment ?? 0));
        this.parcelas.clear();
        this.parcelasTocadas = false;
        if (ps.length >= 2) {
          this.form.patchValue({ parcelar: 'Sim', qtdParcelas: ps.length });
          for (const p of ps) this.parcelas.push(this.fb.group({ id: [p.id], installment: [p.installment], dueDate: [dia(p.dueDate)], amount: [p.amount] }));
        }
        this.carregarAnexos(id);
      },
      error: () => this.erro.set('Não foi possível carregar o título para edição.'),
    });
  }

  onPedido(o: SearchOption | null): void {
    this.form.get('codCompras')?.setValue(o ? (this.codigoDoPedido.get(Number(o.id)) ?? '') : '');
  }
  contratoSel(): Contrato | null {
    const id = Number(this.form.get('contrato')?.value);
    return this.contratos().find(c => c.id === id) ?? null;
  }

  // ── anexos ────────────────────────────────────────────────────────────────
  readonly anexos = signal<any[]>([]);
  readonly enviando = signal(false);
  private carregarAnexos(id: number): void {
    const req = this.pagar ? this.apSvc.listFiles(id) : this.arSvc.listFiles(id);
    (req as any).subscribe({ next: (v: any[]) => this.anexos.set(v ?? []), error: () => this.anexos.set([]) });
  }
  nomeDoAnexo(a: any): string {
    const bruto = a.fileKey || a.fileUrl || '';
    try { return decodeURIComponent(String(bruto).split('?')[0].split('/').pop() || 'arquivo'); } catch { return 'arquivo'; }
  }
  onAnexo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const id = this.editandoId();
    input.value = '';
    if (!file || !id) return;
    this.enviando.set(true);
    this.upload.uploadOneFile(file).subscribe({
      next: f => {
        const req = this.pagar ? this.apSvc.attachFile(id, { fileUrl: f.fileUrl, fileKey: f.fileKey }) : this.arSvc.attachFile(id, { fileUrl: f.fileUrl, fileKey: f.fileKey });
        (req as any).subscribe({
          next: () => { this.enviando.set(false); this.carregarAnexos(id); this.notify.success('Anexo adicionado.'); },
          error: (e: any) => { this.enviando.set(false); this.notify.error(e?.error?.message ?? 'Erro ao vincular o anexo.'); },
        });
      },
      error: (e: any) => { this.enviando.set(false); this.notify.error(e?.error?.message ?? 'Erro ao enviar o arquivo.'); },
    });
  }
  removerAnexo(fileId: number): void {
    const id = this.editandoId();
    if (!id) return;
    const req = this.pagar ? this.apSvc.removeFile(id, fileId) : this.arSvc.removeFile(id, fileId);
    (req as any).subscribe({ next: () => this.carregarAnexos(id), error: (e: any) => this.notify.error(e?.error?.message ?? 'Não foi possível remover o anexo.') });
  }

  // ── reiniciar, voltar, salvar ─────────────────────────────────────────────
  reiniciar(): void {
    this.form.reset({
      tipoLancamento: 'Real', parcelar: 'Nao', qtdParcelas: 2, situacao: 'Open', edicaoManual: false,
      dataCadastro: new Date().toISOString().slice(0, 10),
    });
    this.rateios.clear(); this.rateios.push(this.novaLinha());
    this.parcelas.clear();
    this.impostosArr.controls.forEach(g => g.patchValue({ rate: '', code: '', amount: null }));
    this.erro.set(null);
    this.aba = 'CONTRATO';
  }
  voltar(): void { this.cancelled.emit(); }

  private faltando(): string[] {
    const rotulos: Record<string, string> = {
      stakeholderId: this.contraparte, historico: this.pagar ? 'Histórico da despesa' : 'Histórico da receita',
      tipoLancamento: 'Tipo de lançamento', tipoDocumento: 'Tipo de documento', competencia: 'Competência',
      dataEmissao: 'Data de emissão', vencimento: 'Vencimento', valorBruto: 'Valor bruto', meio: 'Meio de pagamento',
    };
    return Object.keys(rotulos).filter(k => this.form.get(k)?.invalid).map(k => rotulos[k]);
  }

  salvar(): void {
    this.erro.set(null);
    const falta = this.faltando();
    if (falta.length) {
      this.form.markAllAsTouched();
      this.erro.set(`Preencha os campos obrigatórios: ${falta.join(', ')}.`);
      if (falta.includes('Meio de pagamento')) this.aba = 'PAGAMENTO';
      return;
    }
    if (!(this.bruto() > 0)) { this.erro.set('Informe o valor bruto.'); return; }
    const incompleta = this.rateios.controls.findIndex(c => c.invalid || !(Number(c.get('percentage')?.value) > 0));
    if (incompleta >= 0) {
      this.erro.set(`Classificação e rateio: informe Categoria, Centro de custo e % ${this.rateios.length > 1 ? 'na linha ' + (incompleta + 1) : ''}.`.replace(' .', '.'));
      return;
    }
    if (Math.round(this.somaPercentual() * 100) > 10000) { this.erro.set(`A soma dos percentuais do rateio é ${this.somaPercentual()}% — não pode passar de 100%.`); return; }
    if (this.liquido() < 0) { this.erro.set('O valor retido não pode ser maior que o valor bruto.'); this.aba = 'IMPOSTOS'; return; }
    const parcelar = this.form.get('parcelar')?.value === 'Sim';
    if (parcelar && this.parcelas.length < 2) { this.erro.set('Gere ao menos 2 parcelas, ou marque Parcelar = Não.'); this.aba = 'PARCELAMENTO'; return; }

    const v = this.form.getRawValue();
    const id = (x: any) => (x ? Number(x) : undefined);
    const taxes = this.impostosArr.controls
      .map((g, i) => ({ taxType: g.get('taxType')!.value, rate: this.n(g.get('rate')?.value) || 0, amount: this.retidoDe(i), code: (g.get('code')?.value || '').trim() || undefined }))
      .filter(t => t.rate > 0 || t.amount > 0);
    const rateios = this.rateios.controls.map(c => ({
      accountPlanId: id(c.get('accountPlanId')?.value), costCenterId: id(c.get('costCenterId')?.value),
      projectId: id(c.get('projectId')?.value), subProjectId: id(c.get('activityId')?.value),
      percentage: Number(c.get('percentage')?.value) || 0,
    }));
    const enviarParcelas = !this.ehEdicao() || this.parcelasTocadas || this.parcelas.dirty;
    const installments = parcelar
      ? this.parcelas.controls.map((c, i) => ({ id: c.get('id')?.value ?? undefined, installment: Number(c.get('installment')?.value) || i + 1, dueDate: c.get('dueDate')?.value, amount: this.n(c.get('amount')?.value) || 0 }))
      : [];

    let payload: any;
    if (this.pagar) {
      payload = {
        stakeholderId: Number(v.stakeholderId), history: v.historico, description: v.historico,
        expenseType: v.tipo || undefined, entryKind: v.tipoLancamento, type: v.tipoDocumento, document: v.numeroDocumento || undefined,
        competencyDate: v.competencia, issueDate: v.dataEmissao, dueDate: v.vencimento,
        grossAmount: this.bruto(), netAmount: this.liquido(),
        orderCode: v.pedido ? (this.codigoDoPedido.get(Number(v.pedido)) ?? undefined) : undefined,
        orderId: id(v.pedido), contractId: id(v.contrato), serviceId: id(v.servico),
        paymentMeans: v.meio || undefined, paymentMethod: v.meio === 'Internet banking' && v.tipoPagamento ? v.tipoPagamento : undefined,
        bankAccountId: id(v.conta), barcode: v.codigoBarras || undefined, ourNumber: v.nossoNumero || undefined,
        manualTaxEdit: !!v.edicaoManual, observation: v.observacoes || undefined,
        taxes, rateios,
      };
      if (enviarParcelas) payload.installments = installments;
    } else {
      payload = {
        stakeholderId: Number(v.stakeholderId), description: v.historico,
        revenueType: v.tipo || undefined, entryKind: v.tipoLancamento, type: v.tipoDocumento, document: v.numeroDocumento || undefined,
        competencyDate: v.competencia, issueDate: v.dataEmissao, dueDate: v.vencimento,
        amount: this.bruto(), netAmount: this.liquido(),
        contractId: id(v.contrato), serviceId: id(v.servico), partnershipId: id(v.termo), status: v.situacao || 'Open',
        paymentMeans: v.meio || undefined, receiptMethod: v.tipoPagamento || undefined,
        receivingBankAccountId: id(v.conta), barcode: v.codigoBarras || undefined, ourNumber: v.nossoNumero || undefined,
        manualTaxEdit: !!v.edicaoManual, observation: v.observacoes || undefined,
        taxes, rateios: rateios.map(r => ({ ...r, amount: this.r2(this.liquido() * r.percentage / 100) })),
      };
      if (enviarParcelas) payload.installments = installments.map(({ id: _id, ...p }) => p);
    }

    this.saving.set(true);
    const idEd = this.editandoId();
    const req = this.pagar
      ? (idEd ? this.apSvc.update(idEd, payload) : this.apSvc.create(payload))
      : (idEd ? this.arSvc.update(idEd, payload) : this.arSvc.create(payload));
    (req as any).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.aviso) this.notify.info(r.aviso);
        if (!this.pagar && !idEd && r?.asaasChargeError) this.notify.error(`Cobrança Asaas não gerada: ${r.asaasChargeError}`);
        this.saved.emit(r);
      },
      error: (e: any) => {
        this.saving.set(false);
        const m = e?.error?.message;
        this.erro.set(Array.isArray(m) ? m.join(', ') : (m ?? 'Não foi possível salvar.'));
      },
    });
  }
}
