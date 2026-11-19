// src/app/features/invoice-review/invoice-review.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceReviewService, InvoiceCard, OrderOption, OrderDetail, ReviewDetail, OrderNote } from './invoice-review.service';
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

  // Card #768 (item 28): o faturamento é por nota fiscal (recebimento), não pelo pedido inteiro.
  readonly notes         = signal<OrderNote[]>([]);
  readonly selectedNotes = signal<Set<number>>(new Set());

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
    this.notes.set([]);
    this.selectedNotes.set(new Set());
    const id = Number(this.selectedOrder);
    if (!id) return;
    this.svc.orderNotes(id).subscribe(ns => {
      this.notes.set(ns);
      // já vêm marcadas as notas ainda não faturadas
      this.selectedNotes.set(new Set(ns.filter(n => !n.accountPayableId).map(n => n.receiptId)));
    });
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

  toggleNote(n: OrderNote): void {
    if (n.accountPayableId) return;
    const s = new Set(this.selectedNotes());
    s.has(n.receiptId) ? s.delete(n.receiptId) : s.add(n.receiptId);
    this.selectedNotes.set(s);
  }
  notasPendentes(): number { return this.notes().filter(n => !n.accountPayableId).length; }
  totalSelecionado(): number { return this.notes().filter(n => this.selectedNotes().has(n.receiptId)).reduce((s, n) => s + n.amount, 0); }
  podeFaturar(): boolean {
    if (!this.selectedOrder || this.loadingDetail()) return false;
    return this.notes().length ? this.selectedNotes().size > 0 : true;
  }

  invoice(): void {
    if (!this.selectedOrder) { this.notify.error('Escolha um pedido para faturar.'); return; }
    if (this.notes().length && !this.selectedNotes().size) { this.notify.error('Marque ao menos uma nota fiscal para faturar.'); return; }
    const ids = this.notes().length ? [...this.selectedNotes()] : undefined;
    this.svc.createFromOrder(Number(this.selectedOrder), ids).subscribe({
      next: (r: any) => { this.modalOpen.set(false); this.notify.success(r?.message ?? 'Pré-lançamento criado em análise.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao faturar o pedido.'),
    });
  }

  // ── COM-Faturar / I020: conferir o cartão antes de decidir ─────────────────
  // O cartão trazia só título, fornecedor e valor, com Validar e Devolver ao lado:
  // decidia-se sem poder abrir o pedido, os itens nem os anexos. O diálogo abaixo
  // abre a NOTA e o PEDIDO que a originou, e as duas ações ficam disponíveis ali,
  // depois da conferência.
  readonly conferirOpen    = signal(false);
  readonly conferir        = signal<ReviewDetail | null>(null);
  readonly conferirLoading = signal(false);
  readonly conferirError   = signal<string | null>(null);

  abrirConferencia(card: InvoiceCard): void {
    this.conferirOpen.set(true);
    this.conferir.set(null);
    this.conferirError.set(null);
    this.conferirLoading.set(true);
    this.svc.reviewDetail(card.id).subscribe({
      next: d => { this.conferir.set(d); this.conferirLoading.set(false); },
      error: e => {
        this.conferirLoading.set(false);
        this.conferirError.set(e?.error?.message ?? 'Não foi possível abrir a nota para conferência.');
      },
    });
  }
  fecharConferencia(): void { this.conferirOpen.set(false); this.conferir.set(null); }

  /** Soma dos itens do pedido aberto na conferência, para confrontar com o total. */
  somaItensConferencia(): number {
    return (this.conferir()?.pedido?.items ?? []).reduce((s, i) => s + (i.totalValue ?? 0), 0);
  }

  /** A nota em análise ainda pode ser validada/devolvida; as já decididas, não. */
  podeDecidir(): boolean { return this.conferir()?.nota.status === 'UnderReview'; }

  validate(id: number): void {
    this.svc.validate(id).subscribe({
      next: () => {
        this.notify.success('Nota validada — foi para o contas a pagar.');
        this.fecharConferencia();
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao validar.'),
    });
  }
  returnCard(id: number): void {
    const reason = window.prompt('Motivo da devolução ao compras:');
    if (!reason) return;
    this.svc.returnToPurchasing(id, reason).subscribe({
      next: () => {
        this.notify.info('Nota devolvida ao compras.');
        this.fecharConferencia();
        this.load();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao devolver.'),
    });
  }

  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
}
