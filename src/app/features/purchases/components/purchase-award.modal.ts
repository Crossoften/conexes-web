// src/app/features/purchases/components/purchase-award.modal.ts
//
// FE-8 — Adjudicação (Etapa 4). Gera o(s) Pedido(s) de Compra a partir das cotações:
//   • by_supplier: escolhe 1 proposta para toda a requisição → 1 pedido.
//   • by_item:     escolhe uma proposta por item → N pedidos.
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PurchasesService } from '../purchases.service';
import { AwardMode, AwardPayload, PurchaseQuotation, PurchaseRequestItem } from '../purchases.model';

@Component({
  selector: 'app-purchase-award-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './purchase-award.modal.html',
  styleUrl: './purchase-award.modal.scss',
})
export class PurchaseAwardModalComponent implements OnChanges {
  @Input() requestId: number | null = null;
  @Input() requestCode = '';

  @Output() close   = new EventEmitter<void>();
  @Output() awarded = new EventEmitter<void>();

  private svc = inject(PurchasesService);

  readonly items      = signal<PurchaseRequestItem[]>([]);
  readonly quotations = signal<PurchaseQuotation[]>([]);
  readonly loading    = signal(false);
  readonly submitting = signal(false);
  readonly error      = signal<string | null>(null);

  mode: AwardMode = 'by_supplier';
  supplierQuotationId = 0;
  selections: Record<number, number> = {};   // itemId → quotationId
  reason = '';

  private loadedFor: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['requestId']) return;
    const id = this.requestId;
    if (id === this.loadedFor) return;
    this.loadedFor = id;
    this.reset();
    if (id) this.load(id);
  }

  private reset(): void {
    this.items.set([]);
    this.quotations.set([]);
    this.error.set(null);
    this.mode = 'by_supplier';
    this.supplierQuotationId = 0;
    this.selections = {};
    this.reason = '';
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getRequestById(id).subscribe({
      next: req => this.items.set(req.items ?? []),
      error: () => {},
    });
    this.svc.getQuotationsByRequest(id).subscribe({
      next: q => { this.quotations.set(q ?? []); this.loading.set(false); },
      error: err => { this.loading.set(false); this.error.set(this.msg(err, 'Não foi possível carregar as cotações.')); },
    });
  }

  setMode(mode: AwardMode): void { this.mode = mode; }

  /** Propostas elegíveis para adjudicação (exclui reprovadas e placeholders sem proposta). */
  eligible(): PurchaseQuotation[] {
    return this.quotations().filter(
      q => q.status !== 'Rejected' &&
        !(q.status === 'Pending' && (q.unitValue ?? 0) === 0 && (q.totalValue ?? 0) === 0),
    );
  }

  /** Itens com id numérico garantido (base do modo by_item). */
  awardItems(): { id: number; name: string; quantity: number; unit: string }[] {
    return this.items()
      .filter(i => i.id != null)
      .map(i => ({ id: i.id as number, name: i.name, quantity: i.quantity, unit: i.unit }));
  }

  quotationLabel(q: PurchaseQuotation): string {
    const name = q.supplier?.name ?? `Fornecedor #${q.supplierId}`;
    return `${name} — ${this.fmtCurrency(q.totalValue)}`;
  }

  private allItemsSelected(): boolean {
    const items = this.awardItems();
    return items.length > 0 && items.every(i => this.selections[i.id] > 0);
  }

  get canSubmit(): boolean {
    if (this.submitting()) return false;
    return this.mode === 'by_supplier' ? this.supplierQuotationId > 0 : this.allItemsSelected();
  }

  submit(): void {
    const id = this.requestId;
    if (!id || !this.canSubmit) return;

    const payload: AwardPayload =
      this.mode === 'by_supplier'
        ? { mode: 'by_supplier', supplierQuotationId: this.supplierQuotationId }
        : {
            mode: 'by_item',
            selections: this.awardItems().map(i => ({ itemId: i.id, quotationId: this.selections[i.id] })),
          };
    if (this.reason.trim()) payload.reason = this.reason.trim();

    this.submitting.set(true);
    this.error.set(null);
    this.svc.award(id, payload).subscribe({
      next: () => { this.submitting.set(false); this.awarded.emit(); this.close.emit(); },
      error: err => { this.submitting.set(false); this.error.set(this.msg(err, 'Erro ao adjudicar a requisição.')); },
    });
  }

  onClose(): void { this.close.emit(); }

  fmtCurrency(v?: number | null): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private msg(err: unknown, fallback: string): string {
    const m = (err as { error?: { message?: string | string[] } })?.error?.message ?? fallback;
    return Array.isArray(m) ? m.join(', ') : m;
  }
}
