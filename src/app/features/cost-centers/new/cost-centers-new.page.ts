// src/app/features/cost-centers/new/cost-centers-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { CostCentersService } from '../cost-centers.service';
import { CostCenterPayload, LinkedAccount } from '../cost-centers.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface AccountPlanItem {
  id:    number;
  code:  string;
  title: string;
}

interface EntityItem {
  id:        number;
  legalName: string;
  tradeName: string;
}

@Component({
  selector: 'app-cost-centers-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, NgClass],
  templateUrl: './cost-centers-new.page.html',
  styleUrl: './cost-centers-new.page.scss',
})
export class CostCentersNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(CostCentersService);
  private http   = inject(HttpClient);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly accountPlans = signal<AccountPlanItem[]>([]);
  readonly entities     = signal<EntityItem[]>([]);
  readonly loadingLists = signal(true);

  // Contas vinculadas gerenciadas separadamente (array dinâmico)
  linkedAccounts: LinkedAccount[] = [];
  selectedLinkedAccount = '';
  selectedLinkedOrigin  = 'Caixa';

  form: FormGroup = this.fb.group({
    projectType:         ['', Validators.required],
    projectCode:         ['', Validators.required],
    projectTitle:        ['', Validators.required],
    accountingCode:      [''],
    payingSource:        [''],
    startDate:           [''],
    categoryDescription: [''],
    restrictInterest:    [false],
    budgetRestriction:   [false],
    costCenterId:        [null],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

    this.http.get<AccountPlanItem[]>(`${environment.apiUrl}/v1/account-plan`).subscribe({
      next: items => { this.accountPlans.set(items); checkDone(); },
      error: () => checkDone(),
    });

    this.http.get<EntityItem[]>(`${environment.apiUrl}/v1/institutional/entities`).subscribe({
      next: items => { this.entities.set(items); checkDone(); },
      error: () => checkDone(),
    });
  }

  // ── Contas vinculadas ─────────────────────────────────────────────────────

  addLinkedAccount(): void {
    if (!this.selectedLinkedAccount) return;
    const id = Number(this.selectedLinkedAccount);
    if (this.linkedAccounts.some(a => a.accountPlanId === id)) return;
    this.linkedAccounts = [
      ...this.linkedAccounts,
      { origin: this.selectedLinkedOrigin, accountPlanId: id },
    ];
    this.selectedLinkedAccount = '';
  }

  removeLinkedAccount(index: number): void {
    this.linkedAccounts = this.linkedAccounts.filter((_, i) => i !== index);
  }

  getAccountLabel(id: number): string {
    const a = this.accountPlans().find(p => p.id === id);
    return a ? `${a.code} — ${a.title}` : String(id);
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset({ restrictInterest: false, budgetRestriction: false });
    this.linkedAccounts        = [];
    this.selectedLinkedAccount = '';
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

    const payload: CostCenterPayload = {
      code:                v.projectCode         ?? '',
      name:                v.projectTitle        ?? '',
      type:                v.projectType         ?? '',
      description:         v.categoryDescription ?? '',
      status:              'Active',
      accountingCode:      v.accountingCode      ?? '',
      payingSource:        (v.payingSource && v.payingSource !== 'undefined') ? String(v.payingSource) : '',
      startDate:           v.startDate            ?? '',
      categoryDescription: v.categoryDescription  ?? '',
      restrictInterestFine: !!v.restrictInterest,
      restrictBudget:       !!v.budgetRestriction,
      costCenterId:         v.costCenterId ? Number(v.costCenterId) : 0,
      linkedAccounts:       this.linkedAccounts,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/cost-centers']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}