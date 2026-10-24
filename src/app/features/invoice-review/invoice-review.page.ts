// src/app/features/invoice-review/invoice-review.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceReviewService, InvoiceCard, OrderOption, OrderDetail } from './invoice-review.service';
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

  // COMP-18: o pedido aberto para conferência dentro do próprio diálogo.
  readonly detail        = signal<OrderDetail | null>(null);
  readonly loadingDetail = signal(false);
  readonly detailError   = signal<string | null>(null);

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
    this.detail.set(null);
    this.detailError.set(null);
    this.modalOpen.set(true);
    this.svc.orders().subscribe({
      next: v => this.orders.set(v),
      error: e => this.notify.error(e?.error?.message ?? 'Erro ao carregar os pedidos.'),
    });
  }
  closeInvoice(): void { this.modalOpen.set(false); }

  /**
   * COMP-18: escolher o pedido abre o pedido. Antes a tela só tinha o seletor
   * "Pedido #N — fornecedor — total" e faturava sem mostrar o que havia dentro;
   * o financeiro não tinha como conferir itens nem a NF antes de pré-lançar.
   */
  onOrderChange(): void {
    this.detail.set(null);
    this.detailError.set(null);
    const id = Number(this.selectedOrder);
    if (!id) return;
    this.loadingDetail.set(true);
    this.svc.orderDetail(id).subscribe({
      next: d => { this.detail.set(d); this.loadingDetail.set(false); },
      error: e => {
        this.loadingDetail.set(false);
        this.detailError.set(e?.error?.message ?? 'Não foi possível abrir o pedido para conferência.');
      },
    });
  }

  /** Soma dos itens — para confrontar com o total do pedido antes de faturar. */
  somaItens(): number {
    return (this.detail()?.items ?? []).reduce((s, i) => s + (i.totalValue ?? 0), 0);
  }

  nomeDoArquivo(f: { fileUrl: string; fileKey: string | null }): string {
    const bruto = f.fileKey || f.fileUrl || '';
    return decodeURIComponent(bruto.split('/').pop() || 'arquivo');
  }

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
