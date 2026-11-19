// src/app/features/financial-transfers/new-entry/financial-entry-new.page.ts
import { Component, inject, signal, computed, OnInit, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FinancialTransfersService } from '../financial-transfers.service';
import { BankAccountOption, CreateBankEntryPayload, BankMovementRateio, NATUREZAS_RECURSO, StatementPrefill } from '../financial-transfers.model';
import { PurchasesService } from '../../purchases/purchases.service';
import { maskMoney, parseDecimalBR } from '../../../shared/utils/format';

/** Lançamento bancário avulso (crédito/débito) — POST /v1/banking/entries. */
@Component({
  selector: 'app-financial-entry-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass, CurrencyPipe, DecimalPipe],
  templateUrl: './financial-entry-new.page.html',
  styleUrl: '../new/financial-transfer-new.page.scss',
})
export class FinancialEntryNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(FinancialTransfersService);
  private lookups = inject(PurchasesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Card #768 (itens 35, 36 e 38): o formulário abre em pop-up — na lista de
  // Lançamentos (novo/editar) e na conciliação (preenchido com a linha do extrato).
  @Input() embedded = false;
  @Input() editId: number | null = null;
  @Input() prefill: StatementPrefill | null = null;
  @Output() saved     = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();
  @HostBinding('class.is-embedded') get isEmbedded() { return this.embedded; }

  // B5: o mesmo formulário cadastra e edita o lançamento.
  readonly editandoId = signal<number | null>(null);
  readonly ehEdicao = computed(() => this.editandoId() !== null);
  /** Card #768 (item 38): a linha do extrato que está sendo lançada. */
  readonly doExtrato = signal(false);

  readonly accounts = signal<BankAccountOption[]>([]);
  readonly suppliers = signal<{ id: number; name: string }[]>([]);
  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly naturezas = NATUREZAS_RECURSO;

  // LB-03: categoria vira lista de seleção (era digitação livre).
  readonly categorias = [
    'Rendimento de aplicação financeira', 'Tarifa bancária', 'Pacote de serviços bancários',
    'Impostos', 'Outras tarifas', 'Estornos', 'Ajuste de saldo de projeto', 'Outros',
  ];

  // LB-04 / LB-05: classificações.
  readonly accountPlans = signal<{ id: number; name: string }[]>([]);
  readonly costCenters  = signal<{ id: number; name: string }[]>([]);
  readonly projects     = signal<{ id: number; name: string }[]>([]);
  // LB-05: atividades, com o projeto pai, para filtrar por linha de rateio.
  readonly activities   = signal<{ id: number; name: string; parentProjectId?: number | null }[]>([]);

  /**
   * LB-05: as atividades que cabem na linha — as do projeto escolhido. Sem
   * projeto, mostra todas, porque obrigar a escolher projeto para ver atividade
   * travaria quem rateia só por atividade.
   */
  atividadesDaLinha(i: number): { id: number; name: string }[] {
    const projeto = Number(this.rateios.at(i)?.get('projectId')?.value) || null;
    const todas = this.activities();
    if (!projeto) return todas;
    const doProjeto = todas.filter(a => a.parentProjectId === projeto);
    return doProjeto.length ? doProjeto : todas;
  }

  form: FormGroup = this.fb.group({
    bankAccountId: ['', Validators.required],
    description:   ['', Validators.required],
    type:          ['Debit', Validators.required],
    amount:        ['', Validators.required],
    date:          ['', Validators.required],
    category:      [''],
    stakeholderId: [''],   // LB-12: fornecedor (opcional)
    resourceNature: [''],  // Card #768 (item 35)
    observations:  [''],
    rateios:       this.fb.array([]),  // LB-05
  });

  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }

  get titulo(): string {
    if (this.doExtrato()) return 'Novo lançamento bancário';
    return this.ehEdicao() ? 'Editar lançamento bancário' : 'Novo lançamento bancário';
  }

  novaLinhaRateio(valor: Partial<BankMovementRateio> = {}): FormGroup {
    const s = (v: any) => (v ? String(v) : '');
    return this.fb.group({
      accountPlanId: [s(valor.accountPlanId)],
      costCenterId:  [s(valor.costCenterId)],
      projectId:     [s(valor.projectId)],
      activityId:    [s(valor.activityId)],
      percentage:    [valor.percentage ?? (this.rateios?.length ? '' : 100)],
    });
  }

  adicionarRateio(): void { this.rateios.push(this.novaLinhaRateio()); }
  removerRateio(i: number): void {
    // Card #768 (item 35): a classificação é obrigatória — fica ao menos uma linha.
    if (this.rateios.length <= 1) return;
    this.rateios.removeAt(i);
  }

  somaPercentual(): number {
    return this.rateios.controls.reduce((s, c) => s + (Number(c.get('percentage')?.value) || 0), 0);
  }

  valorDaLinha(i: number): number {
    const total = parseDecimalBR(this.form.get('amount')?.value ?? '') || 0;
    const pct = Number(this.rateios.at(i).get('percentage')?.value) || 0;
    return Math.round(total * pct) / 100;
  }

  /** Card #768 (cenário 19/22): a data abre o calendário ao clicar, sem digitar. */
  abrirCalendario(ev: Event): void {
    const el = ev.target as HTMLInputElement & { showPicker?: () => void };
    try { el.showPicker?.(); } catch { /* navegador sem showPicker */ }
  }

  ngOnInit(): void {
    this.svc.getBankAccounts().subscribe({
      next: list => this.accounts.set(list),
      error: ()   => this.accounts.set([]),
    });
    this.lookups.getSuppliersLookup().subscribe({
      next: v => this.suppliers.set(v as { id: number; name: string }[]),
      error: () => this.suppliers.set([]),
    });
    // LB-04: contas analíticas do plano cadastrado (a Categoria do rateio).
    this.lookups.getAccountPlansLookup().subscribe({
      next: v => this.accountPlans.set(v as { id: number; name: string }[]),
      error: () => this.accountPlans.set([]),
    });
    // LB-05: CP-01 (achado) — só as analíticas; sintética é totalizadora e o
    // back recusa lançamento nela com 400.
    this.lookups.getCostCentersLookup().subscribe({
      next: v => this.costCenters.set(this.lookups.apenasAnaliticas(v) as { id: number; name: string }[]),
      error: () => this.costCenters.set([]),
    });
    this.lookups.getActivitiesLookup().subscribe({
      next: v => this.activities.set(v as { id: number; name: string; parentProjectId?: number | null }[]),
      error: () => this.activities.set([]),
    });
    this.lookups.getProjectsLookup().subscribe({
      next: v => this.projects.set(this.lookups.apenasAnaliticas(v) as { id: number; name: string }[]),
      error: () => this.projects.set([]),
    });

    // B5: com id (rota ou pop-up), carrega o lançamento para edição.
    const id = this.editId ?? Number(this.route.snapshot.paramMap.get('id'));
    if (id && !isNaN(Number(id))) { this.carregarParaEdicao(Number(id)); return; }

    // Card #768 (item 38): tipo, descrição, data, valor e conta vêm do extrato.
    if (this.prefill) {
      const p = this.prefill;
      this.doExtrato.set(true);
      this.form.patchValue({
        bankAccountId: String(p.bankAccountId),
        type: p.type,
        description: p.description ?? '',
        date: (p.date ?? '').slice(0, 10),
        amount: Number(p.amount ?? 0).toFixed(2).replace('.', ','),
      });
      // o que veio do extrato não muda — só a classificação é informada aqui
      for (const k of ['bankAccountId', 'type', 'date', 'amount']) this.form.get(k)?.disable();
    }
    this.rateios.push(this.novaLinhaRateio());
  }

  /** B5: traz o lançamento gravado para o formulário, com a classificação. */
  private carregarParaEdicao(id: number): void {
    this.svc.getEntry(id).subscribe({
      next: (r: any) => {
        this.editandoId.set(id);
        this.form.patchValue({
          bankAccountId: r.bankAccountId ? String(r.bankAccountId) : '',
          description:   r.description ?? '',
          type:          r.type ?? 'Credit',
          amount:        r.amount != null ? Number(r.amount).toFixed(2).replace('.', ',') : '',
          date:          (r.date ?? '').slice(0, 10),
          category:      r.category ?? '',
          stakeholderId: r.stakeholderId ? String(r.stakeholderId) : '',
          resourceNature: r.resourceNature ?? '',
          observations:  r.observation ?? '',
        });
        this.rateios.clear();
        for (const linha of r.rateios ?? []) this.rateios.push(this.novaLinhaRateio(linha));
        // lançamento antigo sem rateio: a classificação que estava no topo vira a 1ª linha
        if (!this.rateios.length) {
          this.rateios.push(this.novaLinhaRateio({ accountPlanId: r.accountPlanId, costCenterId: r.costCenterId, percentage: 100 }));
        }
      },
      error: () => this.errorMsg.set('Não foi possível carregar o lançamento para edição.'),
    });
  }

  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskMoney(el.value);
    this.form.get('amount')?.setValue(el.value, { emitEvent: false });
  }

  private toIso(value: string): string | undefined {
    const iso = (value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!iso) return undefined;
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  resetForm(): void {
    const preservar = this.doExtrato() ? this.form.getRawValue() : null;
    this.rateios.clear();
    this.form.reset({ type: 'Debit' });
    if (preservar) {
      this.form.patchValue({ bankAccountId: preservar.bankAccountId, type: preservar.type, date: preservar.date, amount: preservar.amount, description: this.prefill?.description ?? '' });
    }
    this.rateios.push(this.novaLinhaRateio());
    this.errorMsg.set(null);
  }

  voltar(): void {
    if (this.embedded) { this.cancelled.emit(); return; }
    this.router.navigate(['/financial-transfers'], { queryParams: { view: 'entries' } });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set(
        this.accounts().length === 0
          ? 'Não há conta bancária cadastrada. Cadastre uma conta bancária antes de registrar lançamentos.'
          : 'Preencha os campos obrigatórios destacados (tipo, descrição, data, conta bancária e valor).',
      );
      return;
    }

    const v = this.form.getRawValue();
    const date = this.toIso(v.date);
    if (!date) {
      this.errorMsg.set('Data inválida. Escolha a data no calendário.');
      return;
    }

    // Card #768 (item 35): Categoria, Centro de custo e % são obrigatórios em cada linha.
    const linhas = this.rateios.controls;
    const incompleta = linhas.findIndex(c => !c.get('accountPlanId')?.value || !c.get('costCenterId')?.value || !(Number(c.get('percentage')?.value) > 0));
    if (!linhas.length || incompleta >= 0) {
      this.errorMsg.set(`Rateio por classificação: informe Categoria, Centro de custo e % ${linhas.length > 1 ? 'na linha ' + (incompleta + 1) : 'da classificação'}.`);
      return;
    }
    const soma = this.somaPercentual();
    if (Math.round(soma * 100) > 10000) {
      this.errorMsg.set(`A soma dos percentuais do rateio é ${soma.toFixed(2)}% — não pode passar de 100%.`);
      return;
    }

    const num = (c: any, k: string) => (c.get(k)?.value ? Number(c.get(k)!.value) : undefined);
    const rateios = linhas.map(c => ({
      accountPlanId: num(c, 'accountPlanId'),
      costCenterId:  num(c, 'costCenterId'),
      projectId:     num(c, 'projectId'),
      activityId:    num(c, 'activityId'),
      percentage:    Number(c.get('percentage')?.value) || 0,
    }));
    // a primeira linha também classifica o lançamento (relatórios e filtros usam o topo)
    const classificacao = {
      category:       v.category || undefined,
      stakeholderId:  v.stakeholderId ? Number(v.stakeholderId) : undefined,
      accountPlanId:  rateios[0].accountPlanId,
      costCenterId:   rateios[0].costCenterId,
      resourceNature: v.resourceNature || undefined,
      observation:    v.observations || undefined,
      rateios,
    };

    this.loading.set(true);
    this.errorMsg.set(null);
    let requisicao;
    if (this.doExtrato() && this.prefill) {
      requisicao = this.svc.launchStatementEntry(this.prefill.transactionId, { description: v.description, ...classificacao });
    } else {
      const payload: CreateBankEntryPayload = {
        bankAccountId: Number(v.bankAccountId),
        description:   v.description,
        amount:        parseDecimalBR(v.amount),
        type:          v.type,
        date,
        ...classificacao,
      };
      const id = this.editandoId();
      requisicao = id === null ? this.svc.createEntry(payload) : this.svc.updateEntry(id, payload);
    }

    requisicao.subscribe({
      next: (r: unknown) => {
        this.loading.set(false);
        if (this.embedded) { this.saved.emit(r); return; }
        this.router.navigate(['/financial-transfers'], { queryParams: { view: 'entries' } });
      },
      error: (err: any) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar o lançamento. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
