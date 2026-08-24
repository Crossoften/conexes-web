// src/app/features/chart-of-accounts/components/chart-of-accounts-detail.modal.ts
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Account, AccountPayload, ACCOUNT_STATUS_CONFIG, ACCOUNT_TYPE_LABELS, CATEGORY_TYPE_LABELS } from '../chart-of-accounts.model';
import { ChartOfAccountsService } from '../chart-of-accounts.service';
import { environment } from '../../../../environments/environment';
import { CostCenterCreateModalComponent } from '../../cost-centers/components/cost-center-create.modal';
import { CostCenter } from '../../cost-centers/cost-centers.model';

interface ProjectOption {
  id:   number;
  name: string;
}

@Component({
  selector: 'app-chart-of-accounts-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, CostCenterCreateModalComponent],
  templateUrl: './chart-of-accounts-detail.modal.html',
  styleUrl: './chart-of-accounts-detail.modal.scss',
})
export class ChartOfAccountsDetailModalComponent implements OnChanges {
  @Input() account:       Account | null = null;
  @Input() initialMode:  'view' | 'edit' = 'view';

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<Account>();

  private fb      = inject(FormBuilder);
  private svc     = inject(ChartOfAccountsService);
  private http    = inject(HttpClient);

  readonly statusConfig = ACCOUNT_STATUS_CONFIG;
  readonly typeLabels   = ACCOUNT_TYPE_LABELS;

  mode: 'view' | 'edit' = 'view';

  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  projects: ProjectOption[] = [];
  /** Contas candidatas a "pai" (Totalizadora/Sintética), exceto a própria. */
  parents: Account[] = [];

  /** B2: modal de criação inline de Centro de Custo. */
  readonly showCcModal = signal(false);

  form: FormGroup = this.fb.group({
    categoryType:   ['', Validators.required],
    accountType:    [''],
    categoryGroup:  ['', Validators.required],
    costCenter:     ['', Validators.required],
    categoryCode:   ['', Validators.required],
    categoryTitle:  ['', Validators.required],
    budgetMgmt:     [false],
    provCredit:     [''],
    provDebit:      [''],
    writeOffCredit: [''],
    writeOffDebit:  [''],
    description:    [''],
    status:         ['Active'],
    parentId:       [null],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialMode']) {
      this.mode = this.initialMode;
    }
    if (changes['account'] && this.account) {
      this.mode = this.initialMode;
      this.errorMsg.set(null);
      if (this.mode === 'edit') {
        this.populateForm(this.account);
        this.loadProjects();
        this.loadParents();
      }
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get statusLabel(): string {
    if (!this.account) return '';
    return this.statusConfig[this.account.status]?.label ?? this.account.status;
  }

  get statusVariant(): string {
    if (!this.account) return '';
    return this.statusConfig[this.account.status]?.variant ?? 'neutral';
  }

  get accountTypeLabel(): string {
    if (!this.account) return '';
    return this.typeLabels[this.account.accountType] ?? this.account.accountType;
  }

  get categoryTypeLabel(): string {
    if (!this.account) return '';
    return CATEGORY_TYPE_LABELS[this.account.categoryType] ?? this.account.categoryType;
  }

  /**
   * PC-01: conta superior filtrada pela natureza selecionada.
   * Uma subconta de Entrada só lista pais de Entrada (ou Totalizadora); Saída idem.
   */
  filteredParents(): Account[] {
    const nature = this.form.get('categoryType')?.value;
    if (!nature) return this.parents;
    return this.parents.filter(p => p.categoryType === nature || p.categoryType === 'Totalizadora');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private populateForm(a: Account): void {
    this.form.patchValue({
      categoryType:   a.categoryType   ?? '',
      accountType:    a.accountType    ?? '',
      categoryGroup:  a.categoryGroup  ?? '',
      costCenter:     a.category       ?? '',
      categoryCode:   a.code           ?? '',
      categoryTitle:  a.title          ?? '',
      budgetMgmt:     a.budgetManagement,
      provCredit:     a.creditProvision  ?? '',
      provDebit:      a.debitProvision   ?? '',
      writeOffCredit: a.creditWriteOff   ?? '',
      writeOffDebit:  a.debitWriteOff    ?? '',
      description:    a.description    ?? '',
      status:         a.status         ?? 'Active',
      parentId:       a.parentId       ?? null,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private loadProjects(): void {
    this.http
      .get<{ data: (ProjectOption & { _entityType: string })[] }>(
        `${environment.apiUrl}/v1/projects`,
        { params: { take: '100' } }
      )
      .subscribe({
        next: res => { this.projects = (res.data ?? []).filter(p => p._entityType === 'cost_center'); },
        error: ()  => { this.projects = []; },
      });
  }

  /** Contas que podem ser "conta superior" (Totalizadora/Sintética), exceto a própria. */
  private loadParents(): void {
    this.svc.getAll().subscribe({
      next: list => {
        this.parents = list.filter(a =>
          a.id !== this.account?.id &&
          (a.categoryType === 'Totalizadora' || a.accountType === 'Sintetica'));
      },
      error: () => { this.parents = []; },
    });
  }

  // ── B2: criação inline de Centro de Custo ─────────────────────────────────

  openCcModal(): void  { this.showCcModal.set(true); }
  closeCcModal(): void { this.showCcModal.set(false); }

  onCcCreated(cc: CostCenter): void {
    const name = cc.name || cc.title || cc.code;
    this.projects = [...this.projects, { id: cc.id, name }];
    this.form.patchValue({ costCenter: String(cc.id) });
    this.showCcModal.set(false);
  }

  // ── Mode switching ────────────────────────────────────────────────────────

  enterEditMode(): void {
    this.mode = 'edit';
    this.errorMsg.set(null);
    if (this.account) this.populateForm(this.account);
    this.loadProjects();
    this.loadParents();
  }

  cancelEdit(): void {
    this.errorMsg.set(null);
    // Aberto direto em edição (botão "Editar" da lista) → Cancelar volta à origem (fecha).
    if (this.initialMode === 'edit') {
      this.close.emit();
      return;
    }
    this.mode = 'view';
    if (this.account) this.populateForm(this.account);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  onClose(): void   { this.close.emit(); }
  onDelete(): void  { if (this.account) this.delete.emit(this.account.id); }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.account) return;

    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: Partial<AccountPayload> = {
      code:              v.categoryCode   ?? '',
      title:             v.categoryTitle  ?? '',
      category:          String(v.costCenter ?? ''),   // CAD-002: back valida `category` como string
      categoryGroup:     v.categoryGroup  ?? '',
      categoryType:      v.categoryType   ?? '',
      accountType:       v.accountType    ?? '',
      budgetManagement:  !!v.budgetMgmt,
      description:       v.description    ?? '',
      status:            v.status         ?? 'Active',
      secondaryActivity: '',
      creditProvision:   v.provCredit     ?? '',
      debitProvision:    v.provDebit      ?? '',
      creditWriteOff:    v.writeOffCredit ?? '',
      debitWriteOff:     v.writeOffDebit  ?? '',
      parentId:          v.parentId ? Number(v.parentId) : null,
    };

    this.svc.update(this.account.id, payload).subscribe({
      next: updated => {
        this.saving.set(false);
        this.mode = 'view';
        this.saved.emit(updated);
      },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}