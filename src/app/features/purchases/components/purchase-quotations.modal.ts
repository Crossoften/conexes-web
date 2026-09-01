// src/app/features/purchases/components/purchase-quotations.modal.ts
//
// FE-7 — Gerenciamento de cotações (propostas de fornecedores) de uma requisição.
// Etapa 3 (Cotação): registrar propostas. Etapa 4 (Cotação em aprovação): aprovar/reprovar.
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../shared/services/notification.service';
import { PurchasesService } from '../purchases.service';
import { PurchaseQuotation, PurchaseRef, QuotationStatus } from '../purchases.model';

const QUOTATION_STATUS: Record<QuotationStatus, { label: string; variant: string }> = {
  Pending:  { label: 'Pendente',  variant: 'neutral' },
  Sent:     { label: 'Enviada',   variant: 'warning' },
  Approved: { label: 'Aprovada',  variant: 'success' },
  Rejected: { label: 'Reprovada', variant: 'danger'  },
};

@Component({
  selector: 'app-purchase-quotations-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './purchase-quotations.modal.html',
  styleUrl: './purchase-quotations.modal.scss',
})
export class PurchaseQuotationsModalComponent implements OnChanges {
  @Input() requestId: number | null = null;
  @Input() requestCode = '';
  @Input() canRegister = false;      // Etapa 3
  @Input() canApproveQuote = false;  // Etapa 4 + papel

  @Output() close = new EventEmitter<void>();

  private svc = inject(PurchasesService);
  private notify = inject(NotificationService);
  private fb  = inject(NonNullableFormBuilder);

  readonly statusConfig = QUOTATION_STATUS;

  readonly quotations = signal<PurchaseQuotation[]>([]);
  readonly loading    = signal(false);
  readonly error      = signal<string | null>(null);
  readonly suppliers  = signal<PurchaseRef[]>([]);
  readonly submitting = signal(false);
  readonly showForm   = signal(false);

  readonly form = this.fb.group({
    supplierId:        [0, [Validators.required, Validators.min(1)]],
    unitValue:         [0, [Validators.required, Validators.min(0.01)]],
    totalValue:        [0, [Validators.required, Validators.min(0.01)]],
    freight:           [0],
    discount:          [0],
    deliveryTime:      [''],
    paymentConditions: [''],
    observation:       [''],
  });

  private loadedFor: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['requestId']) return;
    const id = this.requestId;
    if (id === this.loadedFor) return;
    this.loadedFor = id;
    this.quotations.set([]);
    this.error.set(null);
    this.showForm.set(false);
    this.resetForm();
    if (!id) return;
    this.load();
    // CP-fix (Bug 1): carrega o lookup de fornecedores em qualquer etapa (não só ao
    // registrar). Assim o fallback de nome funciona também na Etapa 4, mesmo que alguma
    // cotação venha sem o supplier no include (ex.: fornecedor removido do cadastro).
    if (this.suppliers().length === 0) {
      this.svc.getSuppliersLookup().subscribe({ next: s => this.suppliers.set(s), error: () => {} });
    }
  }

  private load(): void {
    const id = this.requestId;
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.svc.getQuotationsByRequest(id).subscribe({
      next: q => { this.quotations.set(q ?? []); this.loading.set(false); },
      error: err => { this.loading.set(false); this.error.set(this.msg(err, 'Não foi possível carregar as cotações.')); },
    });
  }

  toggleForm(): void { this.showForm.update(v => !v); }

  submit(): void {
    const id = this.requestId;
    if (!id) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.svc.createQuotation({
      purchaseRequestId: id,
      supplierId:        v.supplierId,
      unitValue:         v.unitValue,
      totalValue:        v.totalValue,
      freight:           v.freight   || undefined,
      discount:          v.discount  || undefined,
      deliveryTime:      v.deliveryTime      || undefined,
      paymentConditions: v.paymentConditions || undefined,
      observation:       v.observation       || undefined,
    }).subscribe({
      next: created => {
        this.quotations.update(list => [...list, created]);
        this.submitting.set(false);
        this.showForm.set(false);
        this.resetForm();
      },
      error: err => { this.submitting.set(false); this.error.set(this.msg(err, 'Erro ao registrar a cotação.')); },
    });
  }

  approve(q: PurchaseQuotation): void {
    this.error.set(null);
    this.svc.approveQuotation(q.id).subscribe({ next: () => { this.notify.success('Cotação aprovada.'); this.load(); }, error: err => this.error.set(this.msg(err, 'Erro ao aprovar a cotação.')) });
  }

  reject(q: PurchaseQuotation): void {
    this.error.set(null);
    this.svc.rejectQuotation(q.id).subscribe({ next: () => { this.notify.success('Cotação reprovada.'); this.load(); }, error: err => this.error.set(this.msg(err, 'Erro ao reprovar a cotação.')) });
  }

  onClose(): void { this.close.emit(); }

  /** CP-15: placeholder do fornecedor sugerido, ainda sem proposta preenchida. */
  isAwaitingProposal(q: PurchaseQuotation): boolean {
    return q.status === 'Pending' && (q.unitValue ?? 0) === 0 && (q.totalValue ?? 0) === 0;
  }

  /** Mostra aprovar/reprovar só para propostas ainda em aberto e já preenchidas. */
  isPending(q: PurchaseQuotation): boolean {
    return (q.status === 'Pending' || q.status === 'Sent') && !this.isAwaitingProposal(q);
  }

  /** Rótulo por linha (trata o placeholder do fornecedor sugerido). */
  rowStatusLabel(q: PurchaseQuotation): string {
    return this.isAwaitingProposal(q) ? 'Aguardando proposta' : this.statusLabel(q.status);
  }
  rowStatusVariant(q: PurchaseQuotation): string {
    return this.isAwaitingProposal(q) ? 'neutral' : this.statusVariant(q.status);
  }

  supplierName(q: PurchaseQuotation): string {
    return q.supplier?.name ?? this.suppliers().find(s => s.id === q.supplierId)?.name ?? `Fornecedor #${q.supplierId}`;
  }

  fmtCurrency(v?: number | null): string {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  statusLabel(s: QuotationStatus): string   { return this.statusConfig[s]?.label ?? s; }
  statusVariant(s: QuotationStatus): string { return this.statusConfig[s]?.variant ?? 'neutral'; }

  private resetForm(): void {
    this.form.reset({ supplierId: 0, unitValue: 0, totalValue: 0, freight: 0, discount: 0, deliveryTime: '', paymentConditions: '', observation: '' });
  }

  private msg(err: unknown, fallback: string): string {
    const m = (err as { error?: { message?: string | string[] } })?.error?.message ?? fallback;
    return Array.isArray(m) ? m.join(', ') : m;
  }

  // CP-36: importar propostas de cotação por planilha.
  readonly importing = signal(false);
  downloadQuotTemplate(): void {
    this.svc.quotationsTemplate().subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'modelo-cotacoes.xlsx'; a.click(); URL.revokeObjectURL(url); },
      error: () => {},
    });
  }
  onImportQuotations(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.requestId) return;
    this.importing.set(true);
    this.svc.importQuotations(this.requestId, file).subscribe({
      next: res => { this.importing.set(false); input.value = ''; this.notify.success(res?.message ?? 'Propostas importadas.'); this.load(); },
      error: err => { this.importing.set(false); input.value = ''; this.notify.error(err?.error?.message ?? 'Falha ao importar as propostas.'); },
    });
  }
}
