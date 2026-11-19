// src/app/features/financial-transfers/new/financial-transfer-new.page.ts
import { Component, inject, signal, OnInit, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FinancialTransfersService } from '../financial-transfers.service';
import { BankAccountOption, CreateBankTransferPayload, BankMovementRateio, NATUREZAS_RECURSO, StatementPrefill } from '../financial-transfers.model';
import { PurchasesService } from '../../purchases/purchases.service';
import { maskMoney, parseDecimalBR } from '../../../shared/utils/format';

@Component({
  selector: 'app-financial-transfer-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass, CurrencyPipe, DecimalPipe],
  templateUrl: './financial-transfer-new.page.html',
  styleUrl: './financial-transfer-new.page.scss',
})
export class FinancialTransferNewPage implements OnInit {
  private fb      = inject(FormBuilder);
  private svc     = inject(FinancialTransfersService);
  private lookups = inject(PurchasesService);
  private router  = inject(Router);

  // Card #768 (itens 30, 31 e 38): o formulário abre em pop-up — na lista de
  // Transferências (nova/editar) e na conciliação (preenchido com o extrato).
  @Input() embedded = false;
  @Input() editId: number | null = null;
  @Input() prefill: StatementPrefill | null = null;
  @Input() statementTransactionId: number | null = null;
  @Input() duplicate: any = null;
  @Output() saved     = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();
  @HostBinding('class.is-embedded') get isEmbedded() { return this.embedded; }

  readonly accounts = signal<BankAccountOption[]>([]);
  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  // TR-09: mesmo vocabulário do cadastro de conta bancária.
  readonly naturezas = NATUREZAS_RECURSO;

  // TR-RATEIO: classificações para as linhas de rateio.
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
  readonly accountPlans = signal<{ id: number; name: string }[]>([]);

  form: FormGroup = this.fb.group({
    description:         ['', Validators.required],
    descriptionMode:     ['manual'],            // TR-08
    origin:             ['', Validators.required],
    destination:        ['', Validators.required],
    operationDate:      ['', Validators.required],
    transferValue:      ['', Validators.required],
    differentDateCredit: [false],
    creditDate:         [''],                   // TR-07
    originNature:       [''],                   // TR-09
    destinationNature:  [''],                   // TR-09
    observations:       [''],
    rateios:            this.fb.array([]),      // TR-RATEIO
  });

  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }

  get titulo(): string {
    return this.editId ? 'Editar transferência' : 'Nova transferência';
  }

  /** TR-08: no modo automático a descrição é composta pelo servidor. */
  get descricaoAutomatica(): boolean {
    return this.form.get('descriptionMode')?.value === 'auto';
  }

  /** TR-08: em modo automático a descrição deixa de ser obrigatória. */
  onDescriptionModeChange(): void {
    const campo = this.form.get('description');
    if (this.descricaoAutomatica) {
      campo?.clearValidators();
      campo?.setValue('');
    } else {
      campo?.setValidators(Validators.required);
    }
    campo?.updateValueAndValidity();
  }

  /** TR-07: ligar/desligar o crédito em data diferente ajusta o campo de data. */
  onCreditDateToggle(): void {
    if (!this.form.get('differentDateCredit')?.value) this.form.get('creditDate')?.setValue('');
  }

  /** Card #768 (cenário 19): a data abre o calendário ao clicar, sem digitar. */
  abrirCalendario(ev: Event): void {
    const el = ev.target as HTMLInputElement & { showPicker?: () => void };
    try { el.showPicker?.(); } catch { /* navegador sem showPicker */ }
  }

  novaLinhaRateio(valor: Partial<BankMovementRateio> = {}): FormGroup {
    const s = (v: any) => (v ? String(v) : '');
    return this.fb.group({
      costCenterId:  [s(valor.costCenterId)],
      projectId:     [s(valor.projectId)],
      // LB-05: a atividade da linha
      activityId:    [s(valor.activityId)],
      accountPlanId: [s(valor.accountPlanId)],
      percentage:    [valor.percentage ?? ''],
    });
  }

  adicionarRateio(): void { this.rateios.push(this.novaLinhaRateio()); }
  removerRateio(i: number): void { this.rateios.removeAt(i); }

  /** Soma dos percentuais, para o usuário ver antes de salvar. */
  somaPercentual(): number {
    return this.rateios.controls.reduce((s, c) => s + (Number(c.get('percentage')?.value) || 0), 0);
  }

  /** Valor em reais que cada linha representa sobre o total informado. */
  valorDaLinha(i: number): number {
    const total = parseDecimalBR(this.form.get('transferValue')?.value ?? '') || 0;
    const pct = Number(this.rateios.at(i).get('percentage')?.value) || 0;
    return Math.round(total * pct) / 100;
  }

  ngOnInit(): void {
    // FIN-001: Origem/Destino vêm das contas bancárias cadastradas.
    this.svc.getBankAccounts().subscribe({
      next: list => this.accounts.set(list),
      error: ()   => this.accounts.set([]),
    });
    // TR-RATEIO: classificações disponíveis. CP-01 (achado): só as analíticas —
    // conta sintética é totalizadora e o back recusa lançamento nela.
    this.lookups.getCostCentersLookup().subscribe({
      next: v => this.costCenters.set(this.lookups.apenasAnaliticas(v) as { id: number; name: string }[]),
      error: () => this.costCenters.set([]),
    });
    // LB-05: atividades (nível abaixo de projeto), para a coluna Atividade do rateio.
    this.lookups.getActivitiesLookup().subscribe({
      next: v => this.activities.set(v as { id: number; name: string; parentProjectId?: number | null }[]),
      error: () => this.activities.set([]),
    });
    this.lookups.getProjectsLookup().subscribe({
      next: v => this.projects.set(this.lookups.apenasAnaliticas(v) as { id: number; name: string }[]),
      error: () => this.projects.set([]),
    });
    this.lookups.getAccountPlansLookup().subscribe({
      next: v => this.accountPlans.set(v as { id: number; name: string }[]),
      error: () => this.accountPlans.set([]),
    });

    // Card #768 (item 31): editar carrega a transferência gravada, com o rateio.
    if (this.editId) { this.carregarParaEdicao(this.editId); return; }

    // Card #768 (item 38): aberto da conciliação — conta, valor, data e descrição do extrato.
    if (this.prefill) {
      const p = this.prefill;
      this.form.patchValue({
        description: p.description ?? '',
        // débito sai da conta do extrato; crédito entra nela
        origin: p.type === 'Debit' ? String(p.bankAccountId) : '',
        destination: p.type === 'Credit' ? String(p.bankAccountId) : '',
        operationDate: (p.date ?? '').slice(0, 10),
        transferValue: p.amount != null ? Number(p.amount).toFixed(2).replace('.', ',') : '',
      });
      return;
    }

    // TR-04: duplicar — o formulário abre pré-preenchido com os dados do registro de origem.
    const dup = this.duplicate || (history.state && history.state.duplicate) || null;
    if (dup) {
      this.form.patchValue({
        description: dup.description && dup.description !== '—' ? dup.description : '',
        origin: dup.originAccountId ? String(dup.originAccountId) : '',
        destination: dup.destinationAccountId ? String(dup.destinationAccountId) : '',
        operationDate: typeof dup.rawDate === 'string' ? dup.rawDate.slice(0, 10) : '',
        transferValue: dup.rawAmount != null ? Number(dup.rawAmount).toFixed(2).replace('.', ',') : '',
        observations: dup.observation ?? '',
      });
    }
  }

  private carregarParaEdicao(id: number): void {
    this.svc.getTransfer(id).subscribe({
      next: (t: any) => {
        const modo = t.descriptionMode === 'auto' ? 'auto' : 'manual';
        this.form.patchValue({
          descriptionMode: modo,
          description: modo === 'auto' ? '' : (t.description ?? ''),
          origin: t.originAccountId ? String(t.originAccountId) : '',
          destination: t.destinationAccountId ? String(t.destinationAccountId) : '',
          operationDate: (t.operationDate ?? '').slice(0, 10),
          transferValue: t.amount != null ? Number(t.amount).toFixed(2).replace('.', ',') : '',
          differentDateCredit: !!t.differentCreditDate,
          creditDate: (t.creditDate ?? '').slice(0, 10),
          originNature: t.originResourceNature ?? '',
          destinationNature: t.destinationResourceNature ?? '',
          observations: t.observation ?? '',
        });
        this.onDescriptionModeChange();
        this.rateios.clear();
        for (const r of t.rateios ?? []) this.rateios.push(this.novaLinhaRateio(r));
      },
      error: () => this.errorMsg.set('Não foi possível carregar a transferência para edição.'),
    });
  }

  /** Máscara monetária BR no valor. */
  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskMoney(el.value);
    this.form.get('transferValue')?.setValue(el.value, { emitEvent: false });
  }

  private toIso(value: string): string | undefined {
    const s = (value ?? '').trim();
    // TR-06: input type=date entrega yyyy-mm-dd.
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) { const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])); return isNaN(d.getTime()) ? undefined : d.toISOString(); }
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!br) return undefined;
    const date = new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  resetForm(): void {
    this.rateios.clear();
    this.form.reset({ differentDateCredit: false, descriptionMode: 'manual' });
    this.onDescriptionModeChange();
    this.errorMsg.set(null);
  }

  voltar(): void {
    if (this.embedded) { this.cancelled.emit(); return; }
    this.router.navigate(['/financial-transfers']);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // FA-03: não falhar em silêncio — orienta o usuário (inclusive quando não há conta bancária).
      this.errorMsg.set(
        this.accounts().length === 0
          ? 'Não há conta bancária cadastrada. Cadastre uma conta bancária antes de registrar transferências.'
          : 'Preencha os campos obrigatórios destacados (descrição, origem, destino, data e valor).',
      );
      return;
    }

    const v = this.form.value;
    // TR-01: a conta de origem precisa ser diferente da conta de destino.
    if (Number(v.origin) === Number(v.destination)) {
      this.errorMsg.set('A conta de destino deve ser diferente da conta de origem.');
      return;
    }
    const operationDate = this.toIso(v.operationDate);
    if (!operationDate) {
      this.errorMsg.set('Data da operação inválida.');
      return;
    }

    // TR-07: com crédito em data diferente, a data é obrigatória e não pode ser
    // anterior à operação.
    let creditDate: string | undefined;
    if (v.differentDateCredit) {
      creditDate = this.toIso(v.creditDate);
      if (!creditDate) {
        this.errorMsg.set('Informe a data do crédito (ou marque "Não" em Crédito em data diferente).');
        return;
      }
      if (creditDate < operationDate) {
        this.errorMsg.set('A data do crédito não pode ser anterior à data da operação.');
        return;
      }
    }

    // TR-RATEIO: a soma dos percentuais não pode passar de 100.
    const soma = this.somaPercentual();
    if (this.rateios.length && Math.round(soma * 100) > 10000) {
      this.errorMsg.set(`A soma dos percentuais do rateio é ${soma.toFixed(2)}% — não pode passar de 100%.`);
      return;
    }

    const num = (c: any, k: string) => (c.get(k)?.value ? Number(c.get(k)!.value) : undefined);
    const payload: CreateBankTransferPayload = {
      // Card #768 (item 29): no modo Automática a descrição vai vazia e o servidor a compõe.
      description:          this.descricaoAutomatica ? '' : (v.description ?? ''),
      descriptionMode:      this.descricaoAutomatica ? 'auto' : 'manual',
      originAccountId:      Number(v.origin),
      destinationAccountId: Number(v.destination),
      operationDate,
      amount:              parseDecimalBR(v.transferValue),
      differentCreditDate:  !!v.differentDateCredit,
      creditDate,
      originResourceNature:      v.originNature || undefined,
      destinationResourceNature: v.destinationNature || undefined,
      observation:         v.observations || undefined,
      rateios: this.rateios.controls.map(c => ({
        costCenterId:  num(c, 'costCenterId'),
        projectId:     num(c, 'projectId'),
        activityId:    num(c, 'activityId'),
        accountPlanId: num(c, 'accountPlanId'),
        percentage:    Number(c.get('percentage')?.value) || 0,
      })),
    };

    this.loading.set(true);
    this.errorMsg.set(null);
    const req = this.editId
      ? this.svc.updateTransfer(this.editId, payload)
      : this.statementTransactionId
        ? this.svc.createTransferFromStatement(this.statementTransactionId, payload)
        : this.svc.createTransfer(payload);
    req.subscribe({
      next: (r) => {
        this.loading.set(false);
        if (this.embedded) { this.saved.emit(r); return; }
        this.router.navigate(['/financial-transfers']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar a transferência. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
