// src/app/features/purchasing-orders/components/order-detail.modal.ts
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchaseOrder, PurchaseOrderItem } from '../../purchases/purchases.model';
import { PurchasesService } from '../../purchases/purchases.service';
import { ORDER_STATUS_CONFIG } from '../purchasing-orders.model';

// CP-33: linha do formulário de recebimento (uma por item do pedido).
interface ReceiveLine {
  orderItemId: number;
  name:        string;
  ordered:     number;
  received:    number;
  pending:     number;
  input:       string;
}

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './order-detail.modal.html',
  styleUrl: './order-detail.modal.scss',
})
export class OrderDetailModalComponent {
  private svc = inject(PurchasesService);

  @Input() order: PurchaseOrder | null = null;
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();
  // CP-33: emite o id do pedido após registrar recebimento, para o pai recarregar.
  @Output() received = new EventEmitter<number>();

  readonly statusConfig = ORDER_STATUS_CONFIG;

  // CP-33: estado do formulário de recebimento.
  readonly showReceive   = signal(false);
  readonly saving        = signal(false);
  readonly errorMsg      = signal<string | null>(null);
  readonly invoiceNumber = signal('');
  readonly note          = signal('');
  readonly receiveLines  = signal<ReceiveLine[]>([]);

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

  fmtDateTime(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
  }

  fmtCurrency(v?: number | null): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // CP-33: acompanhamento por item — recebida, pendente e situação.
  receivedQty(it: PurchaseOrderItem): number { return it.receivedQty ?? 0; }
  pendingQty(it: PurchaseOrderItem): number {
    return Math.max(0, (it.quantity ?? 0) - this.receivedQty(it));
  }
  itemSituation(it: PurchaseOrderItem): string {
    const rec = this.receivedQty(it);
    if (rec <= 0) return 'Pendente';
    return this.pendingQty(it) > 0 ? 'Parcial' : 'Recebido';
  }
  itemSituationVariant(it: PurchaseOrderItem): string {
    const rec = this.receivedQty(it);
    if (rec <= 0) return 'neutral';
    return this.pendingQty(it) > 0 ? 'warning' : 'success';
  }

  // CP-33: abre/fecha o formulário, semeando as quantidades pendentes.
  toggleReceive(): void {
    if (this.showReceive()) { this.showReceive.set(false); return; }
    const items = this.order?.items ?? [];
    this.receiveLines.set(
      items.map(it => {
        const ordered = it.quantity ?? 0;
        const received = it.receivedQty ?? 0;
        const pending = Math.max(0, ordered - received);
        return { orderItemId: it.id!, name: it.name, ordered, received, pending, input: pending ? String(pending) : '' };
      }),
    );
    this.errorMsg.set(null);
    this.invoiceNumber.set('');
    this.note.set('');
    this.showReceive.set(true);
  }

  private parseQty(v: string): number {
    return parseFloat(String(v ?? '').replace(',', '.')) || 0;
  }

  submitReceipt(): void {
    if (!this.order) return;
    const items = this.receiveLines()
      .map(l => ({ orderItemId: l.orderItemId, quantity: this.parseQty(l.input) }))
      .filter(l => l.quantity > 0);

    if (!items.length) { this.errorMsg.set('Informe ao menos uma quantidade recebida.'); return; }

    const overflow = this.receiveLines().find(l => this.parseQty(l.input) > l.pending + 1e-9);
    if (overflow) { this.errorMsg.set(`A quantidade recebida de "${overflow.name}" excede o pendente (${overflow.pending}).`); return; }

    this.saving.set(true);
    this.errorMsg.set(null);
    this.svc.createOrderReceipt(this.order.id, {
      invoiceNumber: this.invoiceNumber() || undefined,
      note: this.note() || undefined,
      items,
    }).subscribe({
      next: updated => {
        this.saving.set(false);
        this.showReceive.set(false);
        this.order = updated;
        this.received.emit(updated.id);
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Falha ao registrar o recebimento.');
      },
    });
  }
}
