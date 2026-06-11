// src/app/features/approval-tiers/components/approval-tier-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { NgClass, CurrencyPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApprovalTier, ApprovalTierPayload } from '../approval-tiers.model';
import { UserItem } from '../approval-tiers.store';

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

  readonly form = this.fb.group({
    description:  ['', Validators.required],
    approver:     ['', Validators.required],
    purchaseRole: ['', Validators.required],
    tierLevel:    ['', Validators.required],
    minValue:     [0,  Validators.required],
    maxValue:     [0,  Validators.required],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tier'] && this.tier) {
      this.form.patchValue({
        description:  this.tier.description,
        approver:     String(this.tier.userId),
        purchaseRole: this.tier.purchaseRole,
        tierLevel:    String(this.tier.level),
        minValue:     this.tier.minValue,
        maxValue:     this.tier.maxValue,
      });
    }

    if (changes['mode']) {
      this.mode === 'view' ? this.form.disable() : this.form.enable();
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get userName(): string {
    if (!this.tier) return '—';
    const u = this.users.find(u => u.id === this.tier!.userId);
    return u ? u.name : String(this.tier.userId);
  }

  get purchaseRoleLabel(): string {
    if (!this.tier) return '—';
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
      description:  v.description,
      level:        Number(v.tierLevel)  || this.tier.level,
      minValue:     Number(v.minValue)   || 0,
      maxValue:     Number(v.maxValue)   || 0,
      purchaseRole: v.purchaseRole,
      userId:       Number(v.approver)   || this.tier.userId,
    };

    this.save.emit({ id: this.tier.id, payload });
  }
}