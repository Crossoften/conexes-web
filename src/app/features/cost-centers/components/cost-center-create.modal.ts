// src/app/features/cost-centers/components/cost-center-create.modal.ts
//
// B2: modal reutilizável com o formulário COMPLETO de Centro de Custo, para criar
// um CC sem sair do cadastro de Plano de Contas (quebra a dependência circular).
import { Component, EventEmitter, Output, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CostCentersService } from '../cost-centers.service';
import { CostCenter, CostCenterPayload, LinkedAccount, ENTITY_KINDS } from '../cost-centers.model';
import { environment } from '../../../../environments/environment';

interface AccountPlanItem { id: number; code: string; title: string; }
interface EntityItem      { id: number; legalName: string; tradeName: string; }

@Component({
  selector: 'app-cost-center-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './cost-center-create.modal.html',
  styleUrl: './cost-center-create.modal.scss',
})
export class CostCenterCreateModalComponent implements OnInit {
  @Output() created = new EventEmitter<CostCenter>();
  @Output() close   = new EventEmitter<void>();

  private fb   = inject(FormBuilder);
  private svc  = inject(CostCentersService);
  private http = inject(HttpClient);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly accountPlans = signal<AccountPlanItem[]>([]);
  readonly entities     = signal<EntityItem[]>([]);
  readonly loadingLists = signal(true);

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

  ngOnInit(): void {
    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

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
    this.linkedAccounts = [...this.linkedAccounts, { origin: this.selectedLinkedOrigin, accountPlanId: id }];
    this.selectedLinkedAccount = '';
  }

  removeLinkedAccount(index: number): void {
    this.linkedAccounts = this.linkedAccounts.filter((_, i) => i !== index);
  }

  getAccountLabel(id: number): string {
    const a = this.accountPlans().find(p => p.id === id);
    return a ? `${a.code} — ${a.title}` : String(id);
  }

  onClose(): void { this.close.emit(); }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;
    const payload: CostCenterPayload = {
      code:                 v.projectCode         ?? '',
      name:                 v.projectTitle        ?? '',
      type:                 v.projectType         ?? '',
      entityKind:           ENTITY_KINDS.includes(v.projectType) ? v.projectType : undefined,
      description:          v.categoryDescription ?? '',
      status:              'Active',
      accountingCode:       v.accountingCode      ?? '',
      payingSource:         (v.payingSource && v.payingSource !== 'undefined') ? String(v.payingSource) : '',
      startDate:            v.startDate ? new Date(v.startDate).toISOString() : null,
      categoryDescription:  v.categoryDescription ?? '',
      restrictInterestFine: !!v.restrictInterest,
      restrictBudget:       !!v.budgetRestriction,
      costCenterId:         v.costCenterId ? Number(v.costCenterId) : null,
      parentProjectId:      v.parentProjectId ? Number(v.parentProjectId) : null,
      linkedAccounts:       this.linkedAccounts,
    };

    this.svc.create(payload).subscribe({
      next: created => {
        this.loading.set(false);
        this.created.emit(created);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
