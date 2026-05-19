// src/app/features/chart-of-accounts/new/chart-of-accounts-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ChartOfAccountsService } from '../chart-of-accounts.service';
import { AccountPayload } from '../chart-of-accounts.model';

@Component({
  selector: 'app-chart-of-accounts-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './chart-of-accounts-new.page.html',
  styleUrl: './chart-of-accounts-new.page.scss',
})
export class ChartOfAccountsNewPage {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(ChartOfAccountsService);

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    categoryType:  ['', Validators.required],
    accountType:   [''],
    categoryGroup: [''],
    costCenter:    [''],
    categoryCode:  ['', Validators.required],
    categoryTitle: ['', Validators.required],
    budgetMgmt:    [false],
    provCredit:    [''],
    provDebit:     [''],
    writeOffCredit:[''],
    writeOffDebit: [''],
    description:   [''],
    parentId:      [null],
  });

  resetForm(): void {
    this.form.reset({
      categoryType:  '',
      accountType:   '',
      categoryGroup: '',
      costCenter:    '',
      categoryCode:  '',
      categoryTitle: '',
      budgetMgmt:    false,
      provCredit:    '',
      provDebit:     '',
      writeOffCredit:'',
      writeOffDebit: '',
      description:   '',
      parentId:      null,
    });
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: AccountPayload = {
      code:              v.categoryCode   ?? '',
      title:             v.categoryTitle  ?? '',
      category:          v.costCenter     ?? '',
      categoryGroup:     v.categoryGroup  ?? '',
      categoryType:      v.categoryType   ?? '',
      accountType:       v.accountType    ?? '',
      budgetManagement:  !!v.budgetMgmt,
      description:       v.description    ?? '',
      status:            'Active',
      secondaryActivity: '',
      creditProvision:   v.provCredit     ?? '',
      debitProvision:    v.provDebit      ?? '',
      creditWriteOff:    v.writeOffCredit ?? '',
      debitWriteOff:     v.writeOffDebit  ?? '',
      parentId:          v.parentId ? Number(v.parentId) : null,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/chart-of-accounts']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar conta. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
