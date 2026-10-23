// src/app/features/financial-transfers/new-entry/financial-entry-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FinancialTransfersService } from '../financial-transfers.service';
import { BankAccountOption, CreateBankEntryPayload, BankMovementRateio } from '../financial-transfers.model';
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

  readonly accounts = signal<BankAccountOption[]>([]);
  readonly suppliers = signal<{ id: number; name: string }[]>([]);
  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  // LB-03: categoria vira lista de seleção (era digitação livre).
  readonly categorias = [
    'Rendimento de aplicação financeira', 'Tarifa bancária', 'Pacote de serviços bancários',
    'Impostos', 'Outras tarifas', 'Estornos', 'Ajuste de saldo de projeto', 'Outros',
  ];

  // LB-04 / LB-05: classificações.
  readonly accountPlans = signal<{ id: number; name: string }[]>([]);
  readonly costCenters  = signal<{ id: number; name: string }[]>([]);
  readonly projects     = signal<{ id: number; name: string }[]>([]);

  form: FormGroup = this.fb.group({
    bankAccountId: ['', Validators.required],
    description:   ['', Validators.required],
    type:          ['Credit', Validators.required],
    amount:        ['', Validators.required],
    date:          ['', Validators.required],
    category:      [''],
    stakeholderId: [''],   // LB-12: fornecedor (opcional)
    accountPlanId: [''],   // LB-04: conta do plano de contas
    observations:  [''],
    rateios:       this.fb.array([]),  // LB-05
  });

  get rateios(): FormArray { return this.form.get('rateios') as FormArray; }

  novaLinhaRateio(valor: Partial<BankMovementRateio> = {}): FormGroup {
    return this.fb.group({
      costCenterId:  [valor.costCenterId ?? ''],
      projectId:     [valor.projectId ?? ''],
      accountPlanId: [valor.accountPlanId ?? ''],
      percentage:    [valor.percentage ?? ''],
    });
  }

  adicionarRateio(): void { this.rateios.push(this.novaLinhaRateio()); }
  removerRateio(i: number): void { this.rateios.removeAt(i); }

  somaPercentual(): number {
    return this.rateios.controls.reduce((s, c) => s + (Number(c.get('percentage')?.value) || 0), 0);
  }

  valorDaLinha(i: number): number {
    const total = parseDecimalBR(this.form.get('amount')?.value ?? '') || 0;
    const pct = Number(this.rateios.at(i).get('percentage')?.value) || 0;
    return Math.round(total * pct) / 100;
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
    // LB-04: contas analíticas do plano cadastrado.
    this.lookups.getAccountPlansLookup().subscribe({
      next: v => this.accountPlans.set(v as { id: number; name: string }[]),
      error: () => this.accountPlans.set([]),
    });
    this.lookups.getCostCentersLookup().subscribe({
      next: v => this.costCenters.set(v as { id: number; name: string }[]),
      error: () => this.costCenters.set([]),
    });
    this.lookups.getProjectsLookup().subscribe({
      next: v => this.projects.set(v as { id: number; name: string }[]),
      error: () => this.projects.set([]),
    });
  }

  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskMoney(el.value);
    this.form.get('amount')?.setValue(el.value, { emitEvent: false });
  }

  onDateInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const d = el.value.replace(/\D/g, '').slice(0, 8);
    let masked = d;
    if (d.length > 4)      masked = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    else if (d.length > 2) masked = `${d.slice(0, 2)}/${d.slice(2)}`;
    el.value = masked;
    this.form.get('date')?.setValue(masked, { emitEvent: false });
  }

  private toIso(value: string): string | undefined {
    const s = (value ?? '').trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!br) return undefined;
    const date = new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  resetForm(): void {
    this.rateios.clear();
    this.form.reset({ type: 'Credit' });
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set(
        this.accounts().length === 0
          ? 'Não há conta bancária cadastrada. Cadastre uma conta bancária antes de registrar lançamentos.'
          : 'Preencha os campos obrigatórios destacados (conta, descrição, tipo, data e valor).',
      );
      return;
    }

    const v = this.form.value;
    const date = this.toIso(v.date);
    if (!date) {
      this.errorMsg.set('Data inválida. Use o formato dd/mm/aaaa.');
      return;
    }

    // LB-05: a soma dos percentuais não pode passar de 100.
    const soma = this.somaPercentual();
    if (this.rateios.length && Math.round(soma * 100) > 10000) {
      this.errorMsg.set(`A soma dos percentuais do rateio é ${soma.toFixed(2)}% — não pode passar de 100%.`);
      return;
    }

    const payload: CreateBankEntryPayload = {
      bankAccountId: Number(v.bankAccountId),
      description:   v.description,
      amount:        parseDecimalBR(v.amount),
      type:          v.type,
      category:      v.category || undefined,
      date,
      observation:   v.observations || undefined,
      stakeholderId: v.stakeholderId ? Number(v.stakeholderId) : undefined,
      accountPlanId: v.accountPlanId ? Number(v.accountPlanId) : undefined,
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
    this.svc.createEntry(payload).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/financial-transfers'], { queryParams: { view: 'entries' } }); },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar o lançamento. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
