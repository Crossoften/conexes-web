// src/app/features/stakeholders/components/stakeholder-detail.modal.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  Stakeholder,
  STAKEHOLDER_STATUS_CONFIG,
  STAKEHOLDER_TYPE_LABELS,
} from '../stakeholders.model';

type ModalTab = 'GERAIS' | 'RISCO' | 'OBSERVACOES';

@Component({
  selector: 'app-stakeholder-detail-modal',
  standalone: true,
  imports: [NgClass],
  templateUrl: './stakeholder-detail.modal.html',
  styleUrl: './stakeholder-detail.modal.scss',
})
export class StakeholderDetailModalComponent {
  @Input() stakeholder: Stakeholder | null = null;

  @Output() close  = new EventEmitter<void>();
  @Output() edit   = new EventEmitter<Stakeholder>();
  @Output() delete = new EventEmitter<number>();

  activeTab: ModalTab = 'GERAIS';

  readonly statusConfig = STAKEHOLDER_STATUS_CONFIG;
  readonly typeLabels   = STAKEHOLDER_TYPE_LABELS;

  // ── Accessors ─────────────────────────────────────────────────────────────

  get statusLabel(): string {
    if (!this.stakeholder) return '';
    return this.statusConfig[this.stakeholder.status]?.label ?? this.stakeholder.status;
  }

  get statusVariant(): string {
    if (!this.stakeholder) return '';
    return this.statusConfig[this.stakeholder.status]?.variant ?? 'neutral';
  }

  get typeLabel(): string {
    if (!this.stakeholder) return '';
    return this.typeLabels[this.stakeholder.type] ?? this.stakeholder.type;
  }

  get primaryAddress() {
    return this.stakeholder?.addresses?.[0] ?? null;
  }

  get fullAddress(): string {
    const a = this.primaryAddress;
    if (!a) return '';
    return [a.street, a.number, a.complement, a.district, a.city, a.state]
      .filter(Boolean)
      .join(', ');
  }

  get primaryBankData() {
    return this.stakeholder?.bankData?.[0] ?? null;
  }

  get bankSummary(): string {
    const b = this.primaryBankData;
    if (!b) return '';
    return [b.bank, `Ag. ${b.agency}`, `C/C ${b.account}-${b.accountDigit}`]
      .filter(Boolean)
      .join(' — ');
  }

  get primaryContact() {
    return this.stakeholder?.contacts?.[0] ?? null;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  setTab(tab: ModalTab): void {
    this.activeTab = tab;
  }

  onClose(): void {
    this.close.emit();
  }

  onEdit(): void {
    if (this.stakeholder) this.edit.emit(this.stakeholder);
  }

  onDelete(): void {
    if (this.stakeholder) this.delete.emit(this.stakeholder.id);
  }
}
