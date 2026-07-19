// src/app/features/cost-centers/components/cost-centers-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, SlicePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CostCenter, CostCenterPayload, CostCenterStatus, COST_CENTER_STATUS_CONFIG, LinkedAccount, resolveEntityType, ENTITY_KINDS } from '../cost-centers.model';
import { CostCentersService } from '../cost-centers.service';
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
  selector: 'app-cost-centers-detail-modal',
  standalone: true,
  imports: [NgClass, SlicePipe, ReactiveFormsModule, FormsModule],
  templateUrl: './cost-centers-detail.modal.html',
  styleUrl: './cost-centers-detail.modal.scss',
})
export class CostCentersDetailModalComponent implements OnChanges, OnInit {
  @Input()  item: CostCenter | null = null;

  @Output() close   = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<number>();
  @Output() saved   = new EventEmitter<CostCenter>();

  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(CostCentersService);
  private readonly http = inject(HttpClient);

  mode: 'view' | 'edit' = 'view';

  readonly statusConfig  = COST_CENTER_STATUS_CONFIG;
  readonly loading       = signal(false);
  readonly errorMsg      = signal<string | null>(null);
  readonly accountPlans  = signal<AccountPlanItem[]>([]);
  readonly entities      = signal<EntityItem[]>([]);
  readonly loadingLists  = signal(true);

  // Contas vinculadas no modo edição
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
    parentProjectId:     [null],
    status:              ['Active'],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
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

  ngOnChanges(): void {
    if (this.item) {
      this.patchForm(this.item);
      this.mode = 'view';
      this.errorMsg.set(null);
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  private patchForm(c: CostCenter): void {
    this.form.patchValue({
      projectType:         c.type               ?? '',
      projectCode:         c.code               ?? '',
      projectTitle:        c.name ?? c.title      ?? '',
      accountingCode:      c.accountingCode      ?? '',
      payingSource:        c.payingSource        ?? '',
      startDate:           c.startDate           ? c.startDate.substring(0, 10) : '',
      categoryDescription: c.categoryDescription ?? '',
      restrictInterest:    !!c.restrictInterestFine,
      budgetRestriction:   !!c.restrictBudget,
      costCenterId:        c.costCenterId        ?? null,
      parentProjectId:     c.parentProjectId     ?? null,
      status:              c.status              ?? 'Active',
    });
    this.linkedAccounts = c.linkedAccounts ? [...c.linkedAccounts] : [];
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

  // ── Accessors view ────────────────────────────────────────────────────────

  get statusLabel(): string {
    if (!this.item) return '';
    return this.statusConfig[this.item.status]?.label ?? this.item.status;
  }

  get statusVariant(): string {
    if (!this.item) return 'neutral';
    return this.statusConfig[this.item.status]?.variant ?? 'neutral';
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  onEdit(): void {
    this.mode = 'edit';
    this.errorMsg.set(null);
  }

  onCancelEdit(): void {
    this.mode = 'view';
    if (this.item) this.patchForm(this.item);
    this.errorMsg.set(null);
  }

  onClose(): void {
    this.mode = 'view';
    this.errorMsg.set(null);
    this.close.emit();
  }

  onDelete(): void {
    if (this.item) this.deleted.emit(this.item.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.item) return;

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: Partial<CostCenterPayload> = {
      code:                 v.projectCode         ?? '',
      name:                 v.projectTitle        ?? '',
      type:                 v.projectType         ?? '',
      // entityKind canônico substitui a detecção frágil por texto em `type`.
      entityKind:           ENTITY_KINDS.includes(v.projectType) ? v.projectType : undefined,
      description:          v.categoryDescription ?? '',
      status:               (v.status as CostCenterStatus) ?? 'Active',
      accountingCode:       v.accountingCode       ?? '',
      payingSource:         (v.payingSource && v.payingSource !== 'undefined') ? String(v.payingSource) : '',
      startDate:            v.startDate ? new Date(v.startDate).toISOString() : null,
      categoryDescription:  v.categoryDescription  ?? '',
      restrictInterestFine: !!v.restrictInterest,
      restrictBudget:       !!v.budgetRestriction,
      costCenterId:         v.costCenterId ? Number(v.costCenterId) : null,
      parentProjectId:      v.parentProjectId ? Number(v.parentProjectId) : null,
      linkedAccounts:       this.linkedAccounts,
    };

    this.svc.update(this.item.id, resolveEntityType(this.item), payload).subscribe({
      next: updated => {
        this.loading.set(false);
        this.mode = 'view';
        this.saved.emit(updated);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}