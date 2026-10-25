// src/app/features/accounts-receivable/new/accounts-receivable-new.page.ts
// FA-09: cadastro manual de conta a receber (doações/repasses/receitas sem nota).
//
// CR-04 / I094: o formulário era uma tela única de nove campos. O critério pede o
// MESMO padrão do formulário de contas a pagar, com os termos de receita: dados
// gerais fixos no topo e, abaixo, as cinco abas — competência e contrato,
// classificação, rateio e parcelamento, impostos retidos e anexos.
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AccountsReceivableService } from '../accounts-receivable.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { UploadService } from '../../../shared/services/upload.service';
import { parseDecimalBR } from '../../../shared/utils/format';

type MainTab = 'COMPETENCIA' | 'CLASSIFICACAO' | 'RATEIO' | 'IMPOSTOS' | 'ANEXOS';
interface Ref { id: number; name: string; }

@Component({
  selector: 'app-accounts-receivable-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './accounts-receivable-new.page.html',
  styleUrl: './accounts-receivable-new.page.scss',
})
export class AccountsReceivableNewPage implements OnInit {
  private fb      = inject(FormBuilder);
  private router  = inject(Router);
  private route   = inject(ActivatedRoute);
  private http    = inject(HttpClient);
  private svc     = inject(AccountsReceivableService);
  private lookups = inject(PurchasesService);
  private upload  = inject(UploadService);
  private notify  = inject(NotificationService);

  readonly saving   = signal(false);
  readonly clientes = signal<{ id: number; nome: string }[]>([]);
  readonly termos   = signal<{ id: number; nome: string }[]>([]);

  /** CR-04: a tela serve cadastro e edição — a ação Editar não tinha destino. */
  readonly editandoId = signal<number | null>(null);
  readonly ehEdicao   = computed(() => this.editandoId() !== null);

  // ── CR-04/I094: as cinco abas, no mesmo desenho de contas a pagar ──────────
  activeMainTab: MainTab = 'COMPETENCIA';
  setMainTab(t: MainTab): void { this.activeMainTab = t; }

  /** Situações que a tela permite escolher na edição. */
  readonly statusOptions = [
    { value: 'Open',          label: 'Em aberto' },
    { value: 'PartiallyPaid', label: 'Parcialmente recebido' },
    { value: 'Paid',          label: 'Recebido' },
    { value: 'Cancelled',     label: 'Cancelado' },
  ];

  /** Formas de recebimento — o par de "forma de pagamento" em contas a pagar. */
  readonly receiptMethods = [
    { value: 'PIX', label: 'PIX' },
    { value: 'BoletoSameBank', label: 'Boleto (mesmo banco)' },
    { value: 'BoletoOtherBank', label: 'Boleto (outro banco)' },
    { value: 'EletronicTransferSameOwner', label: 'Transferência — mesma titularidade' },
    { value: 'EletronicTransferOtherOwner', label: 'Transferência — outra titularidade' },
    { value: 'TEDSameOwner', label: 'TED — mesma titularidade' },
    { value: 'TEDOtherOwner', label: 'TED — outra titularidade' },
  ];

  /** CR-04: as retenções que o título a receber pode sofrer. */
  readonly TAX_DEFS: { ctrl: string; type: string }[] = [
    { ctrl: 'aliqIRRF', type: 'IRRF' }, { ctrl: 'aliqPIS', type: 'PIS' },
    { ctrl: 'aliqPCC', type: 'PCC' }, { ctrl: 'aliqCOFINS', type: 'COFINS' },
    { ctrl: 'aliqINSS', type: 'INSS' }, { ctrl: 'aliqCSLL', type: 'CSLL' },
    { ctrl: 'aliqISS', type: 'ISS' },
  ];

  // listas dos seletores de classificação do rateio
  readonly contratos    = signal<{ id: number; label: string }[]>([]);
  readonly servicos     = signal<Ref[]>([]);
  readonly planos       = signal<Ref[]>([]);
  readonly centros      = signal<Ref[]>([]);
  readonly projetos     = signal<Ref[]>([]);
  readonly atividades   = signal<Ref[]>([]);

  form = this.fb.group({
    stakeholderId: ['', Validators.required],
    invoiceNumber: [''],
    // CR-04: a coluna `document` existe no registro e a exportação já a lista,
    // mas o formulário não oferecia como preenchê-la.
    document:      [''],
    description:   [''],
    issueDate:     ['', Validators.required],
    dueDate:       ['', Validators.required],
    amount:        ['', Validators.required],
    // CR-04: vínculo com o termo/parceria, que o registro suporta.
    partnershipId: [''],
    status:        ['Open'],

    // ── aba Competência e contrato ──
    competencyDate: [''],
    contractId:     [''],
    receiptMethod:  [''],
    observation:    [''],
    // ── aba Classificação ──
    serviceId:      [''],
    type:           [''],
    // ── aba Impostos (alíquotas; os valores são calculados) ──
    aliqIRRF: [''], aliqPIS: [''], aliqPCC: [''], aliqCOFINS: [''],
    aliqINSS: [''], aliqCSLL: [''], aliqISS: [''],
    // ── aba Rateio ──
    rateios: this.fb.array([] as FormGroup[]),
  });

  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }

  private novoRateio() {
    return this.fb.group({
      accountPlanId: [''], costCenterId: [''], projectId: [''], subProjectId: [''],
      percentage: [''], amount: [''],
    });
  }
  addRateio(): void { this.rateios.push(this.novoRateio()); }
  removeRateio(i: number): void { this.rateios.removeAt(i); }

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/v1/stakeholders?take=1000`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.clientes.set(list.map((s) => ({ id: s.id, nome: s.name ?? s.tradeName ?? `#${s.id}` })));
      },
      error: () => {},
    });
    // CR-04: termos/parcerias para o vínculo.
    this.http.get<any>(`${environment.apiUrl}/v1/partnerships?take=500`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.termos.set(list.map((t) => ({
          id: t.id,
          nome: [t.termNumber ?? t.number, t.title ?? t.name].filter(Boolean).join(' — ') || `Termo #${t.id}`,
        })));
      },
      error: () => {},
    });

    // CR-04/I094: as mesmas listas que classificam um título em contas a pagar.
    this.lookups.getAccountPlansLookup().subscribe({
      next: v => this.planos.set((v as any[]).map(r => ({ id: r.id, name: r.name }))), error: () => this.planos.set([]),
    });
    this.lookups.getCostCentersLookup().subscribe({
      next: v => this.centros.set(this.lookups.apenasAnaliticas(v as any).map((r: any) => ({ id: r.id, name: r.name }))),
      error: () => this.centros.set([]),
    });
    this.lookups.getProjectsLookup().subscribe({
      next: v => this.projetos.set(this.lookups.apenasAnaliticas(v as any).map((r: any) => ({ id: r.id, name: r.name }))),
      error: () => this.projetos.set([]),
    });
    this.lookups.getActivitiesLookup().subscribe({
      next: v => this.atividades.set((v as any[]).map(r => ({ id: r.id, name: r.name }))), error: () => this.atividades.set([]),
    });
    this.http.get<any>(`${environment.apiUrl}/v1/purchases/contracts?take=500`).subscribe({
      next: res => {
        const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.contratos.set(rows.map(c => ({ id: c.id, label: [c.number, c.title].filter(Boolean).join(' — ') || `Contrato #${c.id}` })));
      },
      error: () => this.contratos.set([]),
    });
    this.http.get<any>(`${environment.apiUrl}/v1/product-services?take=500`).subscribe({
      next: res => {
        const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.servicos.set(rows.map(s => ({ id: s.id, name: s.name ?? `#${s.id}` })));
      },
      error: () => this.servicos.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editandoId.set(Number(id));
      this.carregarParaEdicao(Number(id));
      this.carregarAnexos(Number(id));
    }
  }

  /** CR-04: traz o título para o formulário, no mesmo desenho do CP-04. */
  private carregarParaEdicao(id: number): void {
    this.svc.getById(id).subscribe({
      next: (r: any) => {
        const dia = (v: any) => (v ? String(v).slice(0, 10) : '');
        const dinheiro = (v: any) =>
          v == null ? '' : Number(v).toFixed(2).replace('.', ',');
        this.form.patchValue({
          stakeholderId: r.stakeholderId != null ? String(r.stakeholderId) : '',
          invoiceNumber: r.invoiceNumber ?? '',
          document:      r.document ?? '',
          description:   r.description ?? '',
          issueDate:     dia(r.issueDate),
          dueDate:       dia(r.dueDate),
          amount:        dinheiro(r.amount),
          partnershipId: r.partnershipId != null ? String(r.partnershipId) : '',
          status:        r.status ?? 'Open',
          // CR-04/I094: o que o formulário completo passou a guardar.
          competencyDate: dia(r.competencyDate),
          contractId:     r.contractId != null ? String(r.contractId) : '',
          receiptMethod:  r.receiptMethod ?? '',
          observation:    r.observation ?? '',
          serviceId:      r.serviceId != null ? String(r.serviceId) : '',
          type:           r.type ?? '',
        });

        // retenções: a alíquota volta para o campo da sua linha
        for (const d of this.TAX_DEFS) {
          const t = (r.taxes ?? []).find((x: any) => x.taxType === d.type);
          this.form.get(d.ctrl)?.setValue(t ? String(t.rate).replace('.', ',') : '', { emitEvent: false });
        }

        // rateio: reabre as linhas gravadas
        this.rateios.clear();
        for (const l of (r.rateios ?? [])) {
          const g = this.novoRateio();
          g.patchValue({
            accountPlanId: l.accountPlanId != null ? String(l.accountPlanId) : '',
            costCenterId:  l.costCenterId != null ? String(l.costCenterId) : '',
            projectId:     l.projectId != null ? String(l.projectId) : '',
            subProjectId:  l.subProjectId != null ? String(l.subProjectId) : '',
            percentage:    l.percentage != null ? String(l.percentage).replace('.', ',') : '',
            amount:        l.amount != null ? Number(l.amount).toFixed(2).replace('.', ',') : '',
          });
          this.rateios.push(g);
        }
      },
      error: () => this.notify.error('Não foi possível carregar a conta a receber.'),
    });
  }

  // ── CR-04/I094: anexos ────────────────────────────────────────────────────
  readonly anexosDoTitulo = signal<any[]>([]);
  readonly enviandoAnexo  = signal(false);
  readonly erroAnexo      = signal<string | null>(null);

  private carregarAnexos(id: number): void {
    this.svc.listFiles(id).subscribe({
      next: v => this.anexosDoTitulo.set(v ?? []),
      error: () => this.anexosDoTitulo.set([]),
    });
  }
  onAnexoSelecionado(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const id = this.editandoId();
    if (!file || !id) return;
    this.erroAnexo.set(null);
    this.enviandoAnexo.set(true);
    // o arquivo vai primeiro para o armazenamento e só então é amarrado ao título
    this.upload.uploadOneFile(file).subscribe({
      next: enviado => {
        this.svc.attachFile(id, { fileUrl: enviado.fileUrl, fileKey: enviado.fileKey }).subscribe({
          next: () => { this.enviandoAnexo.set(false); this.carregarAnexos(id); this.notify.success('Anexo adicionado.'); },
          error: e => { this.enviandoAnexo.set(false); this.erroAnexo.set(e?.error?.message ?? 'Erro ao vincular o anexo ao título.'); },
        });
      },
      error: e => { this.enviandoAnexo.set(false); this.erroAnexo.set(e?.error?.message ?? 'Erro ao enviar o arquivo.'); },
    });
    input.value = '';
  }
  removerAnexo(fileId: number): void {
    const id = this.editandoId();
    if (!id) return;
    this.svc.removeFile(id, fileId).subscribe({
      next: () => { this.carregarAnexos(id); this.notify.success('Anexo removido.'); },
      error: e => this.notify.error(e?.error?.message ?? 'Não foi possível remover o anexo.'),
    });
  }
  nomeDoAnexo(a: { fileUrl?: string; fileKey?: string | null }): string {
    const bruto = a.fileKey || a.fileUrl || '';
    return decodeURIComponent(String(bruto).split('/').pop() || 'arquivo');
  }

  // ── valores ───────────────────────────────────────────────────────────────
  private numOf(x: any): number { return parseDecimalBR(x); }
  private round2(n: number): number { return Math.round(n * 100) / 100; }

  /** CR-04: as retenções com o valor calculado sobre o valor da receita. */
  private buildTaxes(bruto: number) {
    return this.TAX_DEFS
      .map(d => ({ taxType: d.type, rate: this.numOf(this.form.get(d.ctrl)?.value) }))
      .filter(t => t.rate > 0)
      .map(t => ({ ...t, amount: this.round2(bruto * t.rate / 100) }));
  }
  valorDaRetencao(ctrl: string): number {
    const bruto = this.numOf(this.form.get('amount')?.value);
    return this.round2(bruto * this.numOf(this.form.get(ctrl)?.value) / 100);
  }
  get totalRetido(): number {
    const bruto = this.numOf(this.form.get('amount')?.value);
    return this.round2(this.buildTaxes(bruto).reduce((s, t) => s + t.amount, 0));
  }
  /** CR-04: valor líquido = valor da receita − retenções (calculado, não digitado). */
  get valorLiquido(): number {
    return this.round2(this.numOf(this.form.get('amount')?.value) - this.totalRetido);
  }
  /** Quanto do rateio já foi distribuído, para a tela avisar antes de salvar. */
  get rateioDistribuido(): number {
    return this.round2(this.rateios.controls.reduce((s, g) => s + this.numOf(g.get('amount')?.value), 0));
  }

  private parseMoney(value: any): number { return parseDecimalBR(value); }

  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = el.value.replace(/[^\d.,]/g, '');
    this.form.get('amount')?.setValue(el.value, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios: cliente, datas e valor.');
      return;
    }
    const v = this.form.getRawValue() as any;
    const bruto = this.parseMoney(v.amount);
    const id = (x: any) => (x ? Number(x) : undefined);

    const payload: Record<string, unknown> = {
      stakeholderId: Number(v.stakeholderId),
      issueDate:     v.issueDate,
      dueDate:       v.dueDate,
      amount:        bruto,
      description:   v.description || undefined,
      invoiceNumber: v.invoiceNumber || undefined,
      document:      v.document || undefined,
      status:        v.status || 'Open',
      // CR-04/I094
      competencyDate: v.competencyDate || undefined,
      contractId:     id(v.contractId),
      serviceId:      id(v.serviceId),
      type:           v.type || undefined,
      receiptMethod:  v.receiptMethod || undefined,
      observation:    v.observation || undefined,
      taxes:          this.buildTaxes(bruto),
      rateios: (v.rateios ?? [])
        .filter((l: any) => l.accountPlanId || l.costCenterId || l.projectId || l.percentage || l.amount)
        .map((l: any) => ({
          accountPlanId: id(l.accountPlanId),
          costCenterId:  id(l.costCenterId),
          projectId:     id(l.projectId),
          subProjectId:  id(l.subProjectId),
          // Um dos dois basta: o servidor deriva o outro (mesma regra do CP-18).
          percentage: l.percentage ? this.numOf(l.percentage) : undefined,
          amount:     l.amount ? this.numOf(l.amount) : undefined,
        })),
    };
    if (v.partnershipId) payload['partnershipId'] = Number(v.partnershipId);

    this.saving.set(true);
    const editId = this.editandoId();
    // CR-04: PATCH envia só o que a tela edita — recebimentos e parcelas do
    // título não são tocados, igual ao desenho do CP-04.
    const requisicao = editId === null
      ? this.svc.create(payload)
      : this.svc.update(editId, payload);

    requisicao.subscribe({
      next: () => {
        this.notify.success(editId === null
          ? 'Conta a receber cadastrada com sucesso.'
          : 'Conta a receber atualizada com sucesso.');
        this.router.navigate(['/accounts-receivable']);
      },
      error: (err) => {
        this.saving.set(false);
        const m = err?.error?.message;
        this.notify.error(Array.isArray(m) ? m.join(', ') : (m || 'Não foi possível salvar a conta a receber.'));
      },
    });
  }
}
