// src/app/features/cost-centers/new/cost-centers-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { CostCentersService } from '../cost-centers.service';
import { CostCenterPayload, LinkedAccount, ENTITY_KINDS } from '../cost-centers.model';
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
  private route  = inject(ActivatedRoute);
  private svc    = inject(CostCentersService);
  private http   = inject(HttpClient);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly accountPlans = signal<AccountPlanItem[]>([]);
  readonly entities     = signal<EntityItem[]>([]);
  readonly loadingLists = signal(true);

  // Preenchido quando a tela é aberta via "Adicionar Subnível" a partir de um pai.
  readonly parentName = signal<string | null>(null);

  // Contas vinculadas gerenciadas separadamente (array dinâmico)
  linkedAccounts: LinkedAccount[] = [];
  selectedLinkedAccount = '';
  selectedLinkedOrigin  = 'Caixa';

  form: FormGroup = this.fb.group({
    projectType:         ['', Validators.required],
    projectCode:         ['', [Validators.required, Validators.pattern(/^[0-9.]+$/)]],
    projectTitle:        ['', Validators.required],
    accountingCode:      [''],
    payingSource:        [''],
    startDate:           [''],
    categoryDescription: [''],
    restrictInterest:    [false],
    budgetRestriction:   [false],
    costCenterId:        [null],
    parentProjectId:     [null],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // "Adicionar Subnível": abre já vinculado a um pai (ex.: projeto dentro de um CC).
    const qp       = this.route.snapshot.queryParamMap;
    const parentId        = qp.get('parentId');
    const parentProjectId = qp.get('parentProjectId');
    if (parentProjectId) {
      // Subnível Atividade: vinculado ao Projeto pai via parentProjectId.
      this.form.patchValue({
        projectType:     qp.get('type') ?? 'atividade',
        parentProjectId: Number(parentProjectId),
      });
      this.parentName.set(qp.get('parentName'));
    } else if (parentId) {
      // Subnível Projeto: vinculado ao Centro de Custo pai via costCenterId.
      this.form.patchValue({
        projectType:  qp.get('type') ?? 'projeto',
        costCenterId: Number(parentId),
      });
      this.parentName.set(qp.get('parentName'));
    }

    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

    // Ambos os endpoints devolvem o envelope { data, count, pages } — lemos `data`
    // de forma tolerante. `take` alto no account-plan para trazer todas as contas
    // (senão o dropdown fica limitado à 1ª página).
    this.http.get<AccountPlanItem[] | { data?: AccountPlanItem[] }>(
      `${environment.apiUrl}/v1/account-plan`, { params: { take: '1000' } },
    ).subscribe({
      next: res => { this.accountPlans.set(Array.isArray(res) ? res : res?.data ?? []); checkDone(); },
      error: () => checkDone(),
    });

    this.http.get<EntityItem[] | { data?: EntityItem[] }>(
      `${environment.apiUrl}/v1/institutional/entities`, { params: { take: '1000' } },
    ).subscribe({
      next: res => { this.entities.set(Array.isArray(res) ? res : res?.data ?? []); checkDone(); },
      error: () => checkDone(),
    });
  }

  // ── Contas vinculadas ─────────────────────────────────────────────────────

  /** Código define a hierarquia (1, 1.1, 1.2) → só dígitos e ponto. */
  onCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const cleaned = el.value.replace(/[^0-9.]/g, '');
    el.value = cleaned;
    this.form.get('projectCode')?.setValue(cleaned, { emitEvent: false });
  }

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

  /**
   * CC-02: o "+" ao lado de "Selecionar conta" abre o cadastro de Contas
   * Bancárias em nova aba, preservando o formulário do Centro de Custo em
   * andamento (o app usa hash routing).
   */
  openBankAccountRegister(): void {
    const base = window.location.href.split('#')[0];
    window.open(`${base}#/bank-accounts/new`, '_blank');
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
      // entityKind canônico substitui a detecção frágil por texto em `type`.
      entityKind:          ENTITY_KINDS.includes(v.projectType) ? v.projectType : undefined,
      description:         v.categoryDescription ?? '',
      status:              'Active',
      accountingCode:      v.accountingCode      ?? '',
      payingSource:        (v.payingSource && v.payingSource !== 'undefined') ? String(v.payingSource) : '',
      startDate:           v.startDate ? new Date(v.startDate).toISOString() : null,
      categoryDescription: v.categoryDescription  ?? '',
      restrictInterestFine: !!v.restrictInterest,
      restrictBudget:       !!v.budgetRestriction,
      costCenterId:         v.costCenterId ? Number(v.costCenterId) : null,
      parentProjectId:      v.parentProjectId ? Number(v.parentProjectId) : null,
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