// src/app/features/financial-transfers/new/financial-transfer-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FinancialTransfersService } from '../financial-transfers.service';
import { BankAccountOption, CreateBankTransferPayload, BankMovementRateio, NATUREZAS_RECURSO } from '../financial-transfers.model';
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

  novaLinhaRateio(valor: Partial<BankMovementRateio> = {}): FormGroup {
    return this.fb.group({
      costCenterId:  [valor.costCenterId ?? ''],
      projectId:     [valor.projectId ?? ''],
      // LB-05: a atividade da linha
      activityId:    [(valor as any).activityId ?? ''],
      accountPlanId: [valor.accountPlanId ?? ''],
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

    // TR-04: duplicar — o formulário abre pré-preenchido com os dados do registro de origem.
    const dup = (history.state && history.state.duplicate) || null;
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

  /** Máscara monetária BR no valor. */
  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskMoney(el.value);
    this.form.get('transferValue')?.setValue(el.value, { emitEvent: false });
  }

  /** Máscara dd/mm/aaaa na data. */
  onDateInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const d = el.value.replace(/\D/g, '').slice(0, 8);
    let masked = d;
    if (d.length > 4)      masked = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    else if (d.length > 2) masked = `${d.slice(0, 2)}/${d.slice(2)}`;
    el.value = masked;
    this.form.get('operationDate')?.setValue(masked, { emitEvent: false });
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
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // FA-03: não falhar em silêncio — orienta o usuário (inclusive quando não há conta bancária).
      this.errorMsg.set(
        this.accounts().length === 0
          ? 'Não há conta bancária cadastrada. Cadastre uma conta bancária antes de registrar transferências.'
          : 'Preencha os campos obrigatórios destacados (origem, destino, data e valor).',
      );
      return;
    }

    const v = this.form.value;
    // TR-01: a conta de origem precisa ser diferente da conta de destino.
    if (Number(v.origin) === Number(v.destination)) {
      this.errorMsg.set('A conta de origem deve ser diferente da conta de destino.');
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

    const payload: CreateBankTransferPayload = {
      description:          v.description,
      descriptionMode:      v.descriptionMode === 'auto' ? 'auto' : 'manual',
      originAccountId:      Number(v.origin),
      destinationAccountId: Number(v.destination),
      operationDate,
      amount:              parseDecimalBR(v.transferValue),
      differentCreditDate:  !!v.differentDateCredit,
      creditDate,
      originResourceNature:      v.originNature || undefined,
      destinationResourceNature: v.destinationNature || undefined,
      observation:         v.observations || undefined,
      rateios: this.rateios.length
        ? this.rateios.controls.map(c => ({
            costCenterId:  c.get('costCenterId')?.value  ? Number(c.get('costCenterId')!.value)  : undefined,
            projectId:     c.get('projectId')?.value     ? Number(c.get('projectId')!.value)     : undefined,
            accountPlanId: c.get('accountPlanId')?.value ? Number(c.get('accountPlanId')!.value) : undefined,
            percentage:    Number(c.get('percentage')?.value) || 0,
          }))
        : undefined,
    };

    this.loading.set(true);
    this.errorMsg.set(null);
    this.svc.createTransfer(payload).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/financial-transfers']); },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar a transferência. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
