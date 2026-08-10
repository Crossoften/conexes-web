// src/app/features/financial-transfers/new/financial-transfer-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { FinancialTransfersService } from '../financial-transfers.service';
import { BankAccountOption, CreateBankTransferPayload } from '../financial-transfers.model';
import { maskMoney, parseDecimalBR } from '../../../shared/utils/format';

@Component({
  selector: 'app-financial-transfer-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './financial-transfer-new.page.html',
  styleUrl: './financial-transfer-new.page.scss',
})
export class FinancialTransferNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(FinancialTransfersService);
  private router = inject(Router);

  readonly accounts = signal<BankAccountOption[]>([]);
  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    description:         ['', Validators.required],
    origin:             ['', Validators.required],
    destination:        ['', Validators.required],
    operationDate:      ['', Validators.required],
    transferValue:      ['', Validators.required],
    differentDateCredit: [false],
    observations:       [''],
  });

  ngOnInit(): void {
    // FIN-001: Origem/Destino vêm das contas bancárias cadastradas.
    this.svc.getBankAccounts().subscribe({
      next: list => this.accounts.set(list),
      error: ()   => this.accounts.set([]),
    });
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
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!br) return undefined;
    const date = new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  resetForm(): void {
    this.form.reset({ differentDateCredit: false });
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const operationDate = this.toIso(v.operationDate);
    if (!operationDate) {
      this.errorMsg.set('Data da operação inválida. Use o formato dd/mm/aaaa.');
      return;
    }

    const payload: CreateBankTransferPayload = {
      description:          v.description,
      originAccountId:      Number(v.origin),
      destinationAccountId: Number(v.destination),
      operationDate,
      amount:              parseDecimalBR(v.transferValue),
      differentCreditDate:  !!v.differentDateCredit,
      observation:         v.observations || undefined,
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
