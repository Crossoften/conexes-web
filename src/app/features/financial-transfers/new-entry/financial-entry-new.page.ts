// src/app/features/financial-transfers/new-entry/financial-entry-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { FinancialTransfersService } from '../financial-transfers.service';
import { BankAccountOption, CreateBankEntryPayload } from '../financial-transfers.model';
import { maskMoney, parseDecimalBR } from '../../../shared/utils/format';

/** Lançamento bancário avulso (crédito/débito) — POST /v1/banking/entries. */
@Component({
  selector: 'app-financial-entry-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './financial-entry-new.page.html',
  styleUrl: '../new/financial-transfer-new.page.scss',
})
export class FinancialEntryNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(FinancialTransfersService);
  private router = inject(Router);

  readonly accounts = signal<BankAccountOption[]>([]);
  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    bankAccountId: ['', Validators.required],
    description:   ['', Validators.required],
    type:          ['Credit', Validators.required],
    amount:        ['', Validators.required],
    date:          ['', Validators.required],
    category:      [''],
    observations:  [''],
  });

  ngOnInit(): void {
    this.svc.getBankAccounts().subscribe({
      next: list => this.accounts.set(list),
      error: ()   => this.accounts.set([]),
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

    const payload: CreateBankEntryPayload = {
      bankAccountId: Number(v.bankAccountId),
      description:   v.description,
      amount:        parseDecimalBR(v.amount),
      type:          v.type,
      category:      v.category || undefined,
      date,
      observation:   v.observations || undefined,
    };

    this.loading.set(true);
    this.errorMsg.set(null);
    this.svc.createEntry(payload).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/financial-transfers']); },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar o lançamento. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
