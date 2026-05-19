// src/app/features/chart-of-accounts/components/chart-of-accounts-detail.modal.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Account, ACCOUNT_STATUS_CONFIG, ACCOUNT_TYPE_LABELS } from '../chart-of-accounts.model';

@Component({
  selector: 'app-chart-of-accounts-detail-modal',
  standalone: true,
  imports: [NgClass],
  templateUrl: './chart-of-accounts-detail.modal.html',
  styleUrl: './chart-of-accounts-detail.modal.scss',
})
export class ChartOfAccountsDetailModalComponent {
  @Input() account: Account | null = null;

  @Output() close  = new EventEmitter<void>();
  @Output() edit   = new EventEmitter<Account>();
  @Output() delete = new EventEmitter<number>();

  readonly statusConfig = ACCOUNT_STATUS_CONFIG;
  readonly typeLabels   = ACCOUNT_TYPE_LABELS;

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

  // ── Handlers ──────────────────────────────────────────────────────────────

  onClose(): void  { this.close.emit(); }
  onEdit(): void   { if (this.account) this.edit.emit(this.account); }
  onDelete(): void { if (this.account) this.delete.emit(this.account.id); }
}
