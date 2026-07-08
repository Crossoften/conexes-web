// src/app/features/purchases/components/purchase-request-detail.modal.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PurchaseRequest, PURCHASE_REQUEST_STATUS_CONFIG } from '../purchases.model';

type DetailTab = 'DADOS' | 'FONTE' | 'ITENS' | 'LOCAL';

@Component({
  selector: 'app-purchase-request-detail-modal',
  standalone: true,
  imports: [],
  templateUrl: './purchase-request-detail.modal.html',
  styleUrl: './purchase-request-detail.modal.scss',
})
export class PurchaseRequestDetailModalComponent {
  @Input() request: PurchaseRequest | null = null;
  @Input() loading = false;

  @Output() close  = new EventEmitter<void>();
  @Output() remove = new EventEmitter<number>();

  activeTab: DetailTab = 'DADOS';

  readonly statusConfig = PURCHASE_REQUEST_STATUS_CONFIG;

  setTab(tab: DetailTab): void {
    this.activeTab = tab;
  }

  onClose(): void {
    this.activeTab = 'DADOS';
    this.close.emit();
  }

  onDelete(): void {
    if (this.request) this.remove.emit(this.request.id);
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  get code(): string {
    if (!this.request) return '—';
    return this.request.referenceNumber ?? `REQ-#${this.request.id}`;
  }

  get statusLabel(): string {
    if (!this.request) return '';
    return this.statusConfig[this.request.status]?.label ?? this.request.status;
  }

  get statusVariant(): string {
    if (!this.request) return 'neutral';
    return this.statusConfig[this.request.status]?.variant ?? 'neutral';
  }

  fmtDate(iso?: string | null): string {
    if (!iso) return 'N/A';
    const date = new Date(iso);
    return isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
  }

  fmtCurrency(value?: number | null): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  fmtBool(value?: boolean): string {
    return value ? 'Sim' : 'Não';
  }

  fmtText(value?: string | null): string {
    return value && value.trim() ? value : 'N/A';
  }
}
