// src/app/features/purchases/components/purchase-analysis.modal.ts
//
// Card #768 (item 25) — Etapa 4 numa tela só: "Analisar cotações".
// Antes eram três (Cotações, Mapa de cotação e Adjudicar): o pop-up de propostas não
// mostrava os itens, o mapa indicava o melhor fornecedor sem dizer por quê e a
// adjudicação pedia a escolha sem exibir os itens. Aqui ficam juntos o comparativo
// por fornecedor, o valor de cada item em cada proposta e a adjudicação (por
// fornecedor ou por item) com justificativa obrigatória.
//
// D1 continua valendo: só se adjudica proposta aprovada (elegível). Ao adjudicar, a
// proposta escolhida que ainda não estava aprovada é aprovada no mesmo passo, com a
// mesma justificativa — o servidor segue recusando adjudicar fora desse caminho.
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { PurchasesService } from '../purchases.service';
import { AwardPayload, PurchaseQuotation, PurchaseRequestItem } from '../purchases.model';
import { PopupShellComponent } from '../../../shared/components/popup-shell/popup-shell.component';
import { NotificationService } from '../../../shared/services/notification.service';

type Mode = 'by_supplier' | 'by_item';

@Component({
  selector: 'app-purchase-analysis-modal',
  standalone: true,
  imports: [FormsModule, PopupShellComponent],
  template: `
  <app-popup-shell title="Análise e adjudicação de cotações" [subtitle]="'Requisição ' + requestCode + ' — compare as propostas e escolha o vencedor.'" icon="chart" [width]="1180" (close)="close.emit()">
    @if (loading()) {
      <p class="an-muted">Carregando propostas…</p>
    } @else if (!proposals().length) {
      <p class="an-muted">Nenhuma proposta com valores nesta requisição. Registre as propostas na Etapa 3.</p>
    } @else {
      @if (error()) { <div class="error-banner" role="alert">{{ error() }}</div> }

      <div class="an-mode">
        <span>Adjudicar</span>
        <div class="pill-toggle" role="group" aria-label="Forma de adjudicação">
          <button type="button" [class.active]="mode() === 'by_supplier'" (click)="mode.set('by_supplier')">Por fornecedor</button>
          <button type="button" [class.active]="mode() === 'by_item'" (click)="mode.set('by_item')">Por item</button>
        </div>
      </div>

      <h3 class="an-title">Comparativo por fornecedor</h3>
      <div class="an-table-wrap">
        <table class="an-table">
          <thead>
            <tr>
              @if (mode() === 'by_supplier') { <th class="center">Vencedor</th> }
              <th>Fornecedor</th>
              <th class="center">Itens cotados</th>
              <th class="right">Subtotal</th>
              <th class="right">Frete</th>
              <th class="right">Desconto</th>
              <th class="right">Total</th>
              <th>Prazo</th>
              <th>Condições</th>
              <th class="center">Situação</th>
            </tr>
          </thead>
          <tbody>
            @for (q of proposals(); track q.id) {
              <tr [class.an-best]="q.id === bestTotalId()">
                @if (mode() === 'by_supplier') {
                  <td class="center"><input type="radio" name="vencedor" [checked]="winnerId() === q.id" (change)="winnerId.set(q.id)" [attr.aria-label]="'Vencedor: ' + name(q)"></td>
                }
                <td>{{ name(q) }} @if (q.id === bestTotalId()) { <span class="an-tag">menor valor total</span> }</td>
                <td class="center">{{ quotedCount(q) }} de {{ items().length }}</td>
                <td class="right">{{ money(subtotal(q)) }}</td>
                <td class="right">{{ money(q.freight) }}</td>
                <td class="right">{{ money(q.discount) }}</td>
                <td class="right"><strong>{{ money(q.totalValue) }}</strong></td>
                <td>{{ q.deliveryTime || '—' }}</td>
                <td>{{ q.paymentConditions || '—' }}</td>
                <td class="center"><span class="an-badge" [class.an-badge--ok]="eligible(q)">{{ eligible(q) ? 'Aprovada' : 'Em análise' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (bestReason()) { <p class="an-note">{{ bestReason() }}</p> }

      <h3 class="an-title">Itens por fornecedor</h3>
      <div class="an-table-wrap">
        <table class="an-table an-table--items">
          <thead>
            <tr>
              <th>Item</th>
              <th class="right">Qtd.</th>
              <th>Un.</th>
              @for (q of proposals(); track q.id) { <th class="right">{{ name(q) }}</th> }
            </tr>
          </thead>
          <tbody>
            @for (it of items(); track it.id) {
              <tr>
                <td>{{ it.name }}</td>
                <td class="right">{{ it.quantity }}</td>
                <td>{{ it.unit }}</td>
                @for (q of proposals(); track q.id) {
                  <td class="right an-cell" [class.an-cell--best]="bestItemQuote(it.id!) === q.id" [class.an-cell--win]="isItemWinner(it.id!, q.id)">
                    @if (cell(q, it.id!); as c) {
                      @if (c.unavailable) { <span class="an-muted">não disponível</span> }
                      @else {
                        <span class="an-unit">{{ money(c.unitValue) }} un.</span>
                        <span class="an-total">{{ money(c.totalValue) }}</span>
                        @if (mode() === 'by_item') {
                          <label class="an-pick"><input type="radio" [name]="'item-' + it.id" [checked]="itemWinner()[it.id!] === q.id" (change)="pickItem(it.id!, q.id)"> escolher</label>
                        }
                      }
                    } @else { <span class="an-muted">não cotado</span> }
                  </td>
                }
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Total da proposta</strong></td>
              @for (q of proposals(); track q.id) { <td class="right"><strong>{{ money(q.totalValue) }}</strong></td> }
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="an-note">Em destaque, o menor valor de cada item. {{ mode() === 'by_item' ? 'Escolha o fornecedor de cada item direto na tabela.' : '' }}</p>

      <h3 class="an-title">Adjudicação</h3>
      <div class="an-adj">
        <p class="an-summary">{{ summary() }}</p>
        <label class="an-label">Justificativa <span class="req">*</span></label>
        <textarea class="an-text" rows="3" [(ngModel)]="reason" placeholder="Por que este(s) fornecedor(es) venceu(ram)? Ex.: menor preço total, prazo de entrega, condições de pagamento…"></textarea>
      </div>
      <div class="an-footer">
        <button type="button" class="btn-outline btn-outline--orange" (click)="close.emit()">Cancelar</button>
        <button type="button" class="btn-solid btn-solid--orange" [disabled]="!canSubmit()" (click)="submit()">
          {{ submitting() ? 'Adjudicando…' : 'Adjudicar e gerar pedido(s)' }}
        </button>
      </div>
    }
  </app-popup-shell>
  `,
  styles: [`
    .an-muted { color: var(--text-secondary,#6B7280); font-size: 13px; }
    .an-mode { display:flex; align-items:center; gap:12px; margin-bottom: 12px; font-weight:600; font-size:14px; }
    .pill-toggle { display:inline-flex; border:1px solid var(--surface-border-mid,#D1D5DB); border-radius:999px; overflow:hidden; background:#fff; }
    .pill-toggle button { border:0; background:transparent; padding:8px 20px; font-size:13.5px; cursor:pointer; }
    .pill-toggle button.active { background: var(--brand-purple,#6366F1); color:#fff; font-weight:600; }
    .an-title { font-size:15px; font-weight:700; margin: 18px 0 8px; }
    .an-table-wrap { overflow-x:auto; background:#fff; border:1px solid var(--surface-border-mid,#E5E7EB); border-radius:12px; }
    .an-table { width:100%; border-collapse:collapse; font-size:13.5px; }
    .an-table th { background:#F9FAFB; font-weight:600; text-align:left; padding:10px 12px; border-bottom:1px solid #E5E7EB; white-space:nowrap; }
    .an-table td { padding:10px 12px; border-bottom:1px solid #F1F1F4; vertical-align: middle; }
    .an-table tfoot td { background:#FAFAFE; }
    .right { text-align:right !important; } .center { text-align:center !important; }
    .an-best td { background:#F0FDF4; }
    .an-tag { margin-left:6px; font-size:11px; font-weight:600; color:#067647; background:#DCFCE7; border-radius:999px; padding:2px 8px; }
    .an-badge { font-size:12px; border-radius:999px; padding:3px 10px; background:#F3F4F6; color:#374151; }
    .an-badge--ok { background:#DCFCE7; color:#067647; }
    .an-cell span { display:block; }
    .an-unit { font-size:12px; color: var(--text-secondary,#6B7280); }
    .an-total { font-weight:600; }
    .an-cell--best { background:#F0FDF4; }
    .an-cell--win { outline: 2px solid var(--brand-purple,#6366F1); outline-offset:-2px; }
    .an-pick { display:inline-flex; gap:4px; align-items:center; font-size:12px; margin-top:4px; cursor:pointer; }
    .an-note { font-size:12.5px; color: var(--text-secondary,#6B7280); margin:6px 2px 0; }
    .an-adj { background:#FAFAFE; border-radius:12px; padding:14px 16px; }
    .an-summary { margin:0 0 10px; font-size:14px; }
    .an-label { font-size:13px; font-weight:600; display:block; margin-bottom:6px; }
    .req { color:#EF4444; }
    .an-text { width:100%; border:1px solid var(--surface-border-mid,#D1D5DB); border-radius:12px; padding:10px 12px; font:inherit; font-size:14px; resize:vertical; }
    .an-footer { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
  `],
})
export class PurchaseAnalysisModalComponent implements OnChanges {
  @Input() requestId: number | null = null;
  @Input() requestCode = '';
  @Output() close   = new EventEmitter<void>();
  @Output() awarded = new EventEmitter<void>();

  private svc = inject(PurchasesService);
  private notify = inject(NotificationService);

  readonly loading    = signal(false);
  readonly submitting = signal(false);
  readonly error      = signal<string | null>(null);
  readonly items      = signal<PurchaseRequestItem[]>([]);
  readonly quotations = signal<PurchaseQuotation[]>([]);
  readonly mode       = signal<Mode>('by_supplier');
  readonly winnerId   = signal<number | null>(null);
  readonly itemWinner = signal<Record<number, number>>({});
  reason = '';

  ngOnChanges(ch: SimpleChanges): void {
    if (!ch['requestId'] || !this.requestId) return;
    this.loading.set(true);
    forkJoin({ req: this.svc.getRequestById(this.requestId), qs: this.svc.getQuotationsByRequest(this.requestId) }).subscribe({
      next: ({ req, qs }) => {
        this.items.set((req.items ?? []).filter(i => i.id != null));
        this.quotations.set(qs ?? []);
        this.winnerId.set(this.bestTotalId());
        // sugestão inicial do modo por item: o menor preço de cada item
        const sel: Record<number, number> = {};
        for (const it of this.items()) { const b = this.bestItemQuote(it.id!); if (b) sel[it.id!] = b; }
        this.itemWinner.set(sel);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.error.set(this.msg(err, 'Não foi possível carregar as propostas.')); },
    });
  }

  /** Propostas com valor (exclui reprovadas e os fornecedores ainda sem proposta). */
  readonly proposals = computed(() => this.quotations().filter(q =>
    q.status !== 'Rejected' && !(q.status === 'Pending' && (q.unitValue ?? 0) === 0 && (q.totalValue ?? 0) === 0)));

  readonly bestTotalId = computed(() => {
    const ps = this.proposals().filter(q => (q.totalValue ?? 0) > 0);
    if (!ps.length) return null;
    return ps.reduce((a, b) => ((b.totalValue ?? 0) < (a.totalValue ?? 0) ? b : a)).id;
  });

  readonly bestReason = computed(() => {
    const id = this.bestTotalId();
    const q = this.proposals().find(p => p.id === id);
    if (!q) return '';
    const comp = this.quotedCount(q) === this.items().length ? 'cotou todos os itens' : `cotou ${this.quotedCount(q)} de ${this.items().length} itens`;
    return `Melhor proposta: ${this.name(q)} — menor valor total (${this.money(q.totalValue)}), ${comp}.`;
  });

  name(q: PurchaseQuotation): string { return q.supplier?.name ?? `Fornecedor #${q.supplierId}`; }
  eligible(q: PurchaseQuotation): boolean { return !!(q as any).eligible || q.status === 'Approved'; }
  cell(q: PurchaseQuotation, itemId: number) { return (q.items ?? []).find(i => i.purchaseRequestItemId === itemId) ?? null; }
  quotedCount(q: PurchaseQuotation): number { return (q.items ?? []).filter(i => !i.unavailable && Number(i.unitValue) > 0).length; }
  subtotal(q: PurchaseQuotation): number { return (q.items ?? []).reduce((s, i) => s + (Number(i.totalValue) || 0), 0) || (q.unitValue ?? 0); }

  bestItemQuote(itemId: number): number | null {
    let best: { id: number; v: number } | null = null;
    for (const q of this.proposals()) {
      const c = this.cell(q, itemId);
      if (!c || c.unavailable || !(Number(c.unitValue) > 0)) continue;
      if (!best || Number(c.unitValue) < best.v) best = { id: q.id, v: Number(c.unitValue) };
    }
    return best?.id ?? null;
  }
  isItemWinner(itemId: number, qid: number): boolean {
    return this.mode() === 'by_item' ? this.itemWinner()[itemId] === qid : this.winnerId() === qid;
  }
  pickItem(itemId: number, qid: number): void { this.itemWinner.update(m => ({ ...m, [itemId]: qid })); }

  summary(): string {
    if (this.mode() === 'by_supplier') {
      const q = this.proposals().find(p => p.id === this.winnerId());
      return q ? `Vencedor: ${this.name(q)} — ${this.money(q.totalValue)} (1 pedido).` : 'Escolha o fornecedor vencedor no comparativo.';
    }
    const escolhas = Object.values(this.itemWinner());
    const fornecedores = new Set(escolhas);
    const faltam = this.items().length - escolhas.length;
    return faltam > 0 ? `Faltam ${faltam} item(ns) sem fornecedor escolhido.` : `${this.items().length} item(ns) distribuído(s) entre ${fornecedores.size} fornecedor(es) — ${fornecedores.size} pedido(s).`;
  }

  canSubmit(): boolean {
    if (this.submitting() || !this.reason.trim()) return false;
    if (this.mode() === 'by_supplier') return this.winnerId() != null;
    return this.items().every(i => this.itemWinner()[i.id!] != null);
  }

  submit(): void {
    const id = this.requestId;
    if (!id || !this.canSubmit()) return;
    const reason = this.reason.trim();
    const payload: AwardPayload = this.mode() === 'by_supplier'
      ? { mode: 'by_supplier', supplierQuotationId: this.winnerId()! }
      : { mode: 'by_item', selections: this.items().map(i => ({ itemId: i.id!, quotationId: this.itemWinner()[i.id!] })) };
    payload.reason = reason;
    const alvos = this.mode() === 'by_supplier' ? [this.winnerId()!] : [...new Set(Object.values(this.itemWinner()))];
    const aprovar = this.proposals().filter(q => alvos.includes(q.id) && !this.eligible(q));

    this.submitting.set(true);
    this.error.set(null);
    (aprovar.length ? forkJoin(aprovar.map(q => this.svc.approveQuotation(q.id))) : of([]))
      .pipe(switchMap(() => this.svc.award(id, payload)))
      .subscribe({
        next: () => { this.submitting.set(false); this.notify.success('Cotação adjudicada — pedido(s) gerado(s).'); this.awarded.emit(); this.close.emit(); },
        error: err => { this.submitting.set(false); this.error.set(this.msg(err, 'Não foi possível adjudicar.')); },
      });
  }

  money(v?: number | null): string { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  private msg(err: unknown, fallback: string): string {
    const m = (err as { error?: { message?: string | string[] } })?.error?.message ?? fallback;
    return Array.isArray(m) ? m.join(', ') : m;
  }
}
