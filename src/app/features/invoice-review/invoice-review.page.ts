// src/app/features/invoice-review/invoice-review.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceReviewService, InvoiceCard, OrderOption } from './invoice-review.service';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-invoice-review',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './invoice-review.page.html',
  styleUrl: './invoice-review.page.scss',
})
export class InvoiceReviewPage implements OnInit {
  private svc = inject(InvoiceReviewService);
  private notify = inject(NotificationService);

  readonly pending = signal<InvoiceCard[]>([]);
  readonly validated = signal<InvoiceCard[]>([]);
  readonly returned = signal<InvoiceCard[]>([]);
  readonly loading = signal(false);

  readonly modalOpen = signal(false);
  readonly orders = signal<OrderOption[]>([]);
  selectedOrder = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.byStatus('UnderReview').subscribe({ next: v => this.pending.set(v) });
    this.svc.byStatus('Open').subscribe({ next: v => this.validated.set(v) });
    this.svc.byStatus('Returned').subscribe({ next: v => { this.returned.set(v); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  brl(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0); }

  openInvoice(): void {
    this.selectedOrder = '';
    this.modalOpen.set(true);
    this.svc.orders().subscribe({ next: v => this.orders.set(v) });
  }
  closeInvoice(): void { this.modalOpen.set(false); }

  invoice(): void {
    if (!this.selectedOrder) { this.notify.error('Escolha um pedido para faturar.'); return; }
    this.svc.createFromOrder(Number(this.selectedOrder)).subscribe({
      next: () => { this.modalOpen.set(false); this.notify.success('Pré-lançamento criado em análise.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao faturar o pedido.'),
    });
  }

  validate(id: number): void {
    this.svc.validate(id).subscribe({
      next: () => { this.notify.success('Nota validada — foi para o contas a pagar.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao validar.'),
    });
  }
  returnCard(id: number): void {
    const reason = window.prompt('Motivo da devolução ao compras:');
    if (!reason) return;
    this.svc.returnToPurchasing(id, reason).subscribe({
      next: () => { this.notify.info('Nota devolvida ao compras.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao devolver.'),
    });
  }
}
