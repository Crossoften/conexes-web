// src/app/features/purchasing-orders/components/order-detail.modal.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PurchaseOrder } from '../../purchases/purchases.model';
import { ORDER_STATUS_CONFIG } from '../purchasing-orders.model';

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [],
  templateUrl: './order-detail.modal.html',
  styleUrl: './order-detail.modal.scss',
})
export class OrderDetailModalComponent {
  @Input() order: PurchaseOrder | null = null;
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();

  readonly statusConfig = ORDER_STATUS_CONFIG;

  get code(): string {
    if (!this.order) return '—';
    return this.order.number ?? `Pedido #${this.order.id}`;
  }

  statusLabel(status?: string | null): string {
    if (!status) return '—';
    return this.statusConfig[status]?.label ?? status;
  }

  statusVariant(status?: string | null): string {
    if (!status) return 'neutral';
    return this.statusConfig[status]?.variant ?? 'neutral';
  }

  onClose(): void { this.close.emit(); }

  fmtText(v?: string | null): string { return v && v.trim() ? v : '—'; }

  fmtDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
  }

  fmtCurrency(v?: number | null): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
