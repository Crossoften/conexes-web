// src/app/features/approval-tiers/components/approval-tier-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { NgClass, CurrencyPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApprovalTier, ApprovalTierPayload, ApprovalTierType, APPROVAL_TIER_TYPE_LABELS } from '../approval-tiers.model';
import { UserItem } from '../approval-tiers.store';

interface LevelOption { value: string; label: string; }

@Component({
  selector: 'app-approval-tier-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './approval-tier-detail.modal.html',
  styleUrl: './approval-tier-detail.modal.scss',
})
export class ApprovalTierDetailModalComponent implements OnChanges {
  @Input() tier:   ApprovalTier | null = null;
  @Input() users:  UserItem[]          = [];
  @Input() mode:   'view' | 'edit'     = 'view';
  @Input() saving  = false;
  @Input() error:  string | null       = null;

  @Output() close  = new EventEmitter<void>();
  @Output() edit   = new EventEmitter<void>();
  @Output() delete = new EventEmitter<ApprovalTier>();
  @Output() save   = new EventEmitter<{ id: number; payload: ApprovalTierPayload }>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly purchaseRoleOptions = [
    { label: 'Solicitante',           value: 'Requester'          },
    { label: 'Comprador',             value: 'Buyer'              },
    { label: 'Supervisor de Pedidos', value: 'RequestSupervisor'  },
    { label: 'Supervisor de Compras', value: 'PurchaseSupervisor' },
    { label: 'Recebedor de NF',       value: 'InvoiceReceiver'    },
    { label: 'Financeiro',            value: 'Finance'            },
    { label: 'Gerente',               value: 'Manager'            },
  ];

  readonly typeOptions = [
    { label: 'Compras',    value: 'COMPRAS'    },
    { label: 'Financeiro', value: 'FINANCEIRO' },
  ];

  readonly form = this.fb.group({
    description:  ['', Validators.required],
    type:         ['COMPRAS', Validators.required],
    approver:     ['', Validators.required],
    purchaseRole: [''],
    tierLevel:    ['', Validators.required],
    minValue:     [0,  Validators.required],
    maxValue:     [0,  Validators.required],
  });

  get isCompras(): boolean { return this.form.get('type')?.value === 'COMPRAS'; }

  get levelOptions(): LevelOption[] {
    if (this.isCompras) return [1, 2, 3, 4].map(n => ({ value: String(n), label: String(n) }));
    return [
      ...[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) })),
      { value: 'manager', label: 'Gestor' },
    ];
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor() {
    this.form.get('type')!.valueChanges.subscribe(t => this.applyTypeRules(t));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tier'] && this.tier) {
      const type = this.tier.type ?? 'COMPRAS';
      this.form.patchValue({
        description:  this.tier.description,
        type,
        approver:     String(this.tier.userId),
        purchaseRole: this.tier.purchaseRole ?? '',
        tierLevel:    this.tier.isManagerTier ? 'manager' : (this.tier.level != null ? String(this.tier.level) : ''),
        minValue:     this.tier.minValue,
        maxValue:     this.tier.maxValue,
      });
      this.applyTypeRules(type);
    }

    if (changes['mode']) {
      this.mode === 'view' ? this.form.disable() : this.form.enable();
    }
  }

  private applyTypeRules(type: ApprovalTierType | string): void {
    const role = this.form.get('purchaseRole')!;
    if (type === 'COMPRAS') role.setValidators([Validators.required]);
    else { role.clearValidators(); role.setValue(''); }
    role.updateValueAndValidity({ emitEvent: false });
    const level = this.form.get('tierLevel')!;
    if (!this.levelOptions.some(o => o.value === level.value)) level.setValue('');
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get userName(): string {
    if (!this.tier) return '—';
    const u = this.users.find(u => u.id === this.tier!.userId);
    return u ? u.name : String(this.tier.userId);
  }

  get typeLabel(): string {
    if (!this.tier?.type) return '—';
    return APPROVAL_TIER_TYPE_LABELS[this.tier.type] ?? this.tier.type;
  }

  get levelLabel(): string {
    if (!this.tier) return '—';
    if (this.tier.isManagerTier) return 'Gestor';
    return this.tier.level != null ? String(this.tier.level) : '—';
  }

  get purchaseRoleLabel(): string {
    if (!this.tier?.purchaseRole) return '—';
    return this.purchaseRoleOptions.find(o => o.value === this.tier!.purchaseRole)?.label ?? this.tier.purchaseRole;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  onClose(): void  { this.close.emit(); }
  onEdit(): void   { this.edit.emit(); }
  onDelete(): void { if (this.tier) this.delete.emit(this.tier); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.tier) return;

    const v = this.form.getRawValue();

    const payload: ApprovalTierPayload = {
      description: v.description,
      type:        v.type as ApprovalTierType,
      minValue:    Number(v.minValue) || 0,
      maxValue:    Number(v.maxValue) || 0,
      userId:      Number(v.approver) || this.tier.userId,
    };
    if (v.tierLevel === 'manager') payload.isManagerTier = true;
    else if (v.tierLevel)          payload.level = Number(v.tierLevel);
    if (v.type === 'COMPRAS' && v.purchaseRole) payload.purchaseRole = v.purchaseRole;

    this.save.emit({ id: this.tier.id, payload });
  }
}