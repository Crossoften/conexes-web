// src/app/shared/components/baixa-modal/baixa-modal.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

export interface BaixaResult {
  amount: number;
  date: string;
  note?: string;
  // CP-09 / CR-03: acréscimos e abatimento da baixa.
  bankAccountId?: number;
  interest?: number;
  fine?: number;
  discount?: number;
  // D6: parcela escolhida (ausente = baixa no título).
  installmentId?: number;
}

/** Conta bancária para o seletor da baixa. */
export interface BaixaConta { id: number; label: string }

/** D6: parcela do título, para a baixa mirar uma delas. */
export interface BaixaParcela {
  id: number;
  installment: number;
  dueDate: string;
  amount: number;
  amountPaid: number;
}

// Modal de baixa (pagamento/recebimento) total ou parcial — FIN-01.
// Reutilizado por Contas a Pagar (kind='pagar') e Contas a Receber (kind='receber').
@Component({
  selector: 'app-baixa-modal',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="baixa-backdrop" (click)="onCancel()">
      <div class="baixa-modal" (click)="$event.stopPropagation()">
        <div class="baixa-head">
          <h2>{{ kind === 'receber' ? 'Registrar recebimento' : 'Registrar pagamento' }}</h2>
          <button type="button" class="baixa-x" (click)="onCancel()" aria-label="Fechar">✕</button>
        </div>
        <div class="baixa-body">
          <p class="baixa-title">{{ title }}</p>

          <!-- D6: quando o título tem parcelas, a baixa pode mirar uma delas.
               O saldo exibido passa a ser o da parcela escolhida. -->
          @if (parcelas.length) {
            <label class="baixa-lbl" style="margin-top:0;">O que baixar</label>
            <select class="baixa-input" [(ngModel)]="installmentId" (ngModelChange)="onParcelaChange()">
              <option [ngValue]="null">Título inteiro — saldo R$ {{ balance | number:'1.2-2':'pt-BR' }}</option>
              @for (p of parcelas; track p.id) {
                <option [ngValue]="p.id" [disabled]="saldoDaParcela(p) <= 0.005">
                  {{ p.installment }}ª parcela · vence {{ p.dueDate }} · saldo R$ {{ saldoDaParcela(p) | number:'1.2-2':'pt-BR' }}
                  @if (saldoDaParcela(p) <= 0.005) { (quitada) }
                </option>
              }
            </select>
          }

          <p class="baixa-saldo">Saldo em aberto: <strong>R$ {{ saldoBase() | number:'1.2-2':'pt-BR' }}</strong></p>

          <!-- CP-09 / CR-03: juros, multa e desconto. Juros e multa aumentam o
               que se desembolsa; desconto diminui. Nenhum dos três amortiza o
               título além do principal. -->
          <div class="baixa-grid">
            <div>
              <label class="baixa-lbl">Juros</label>
              <input class="baixa-input" type="number" step="0.01" min="0" [(ngModel)]="interest" (ngModelChange)="recalcular()">
            </div>
            <div>
              <label class="baixa-lbl">Multa</label>
              <input class="baixa-input" type="number" step="0.01" min="0" [(ngModel)]="fine" (ngModelChange)="recalcular()">
            </div>
            <div>
              <label class="baixa-lbl">Desconto</label>
              <input class="baixa-input" type="number" step="0.01" min="0" [(ngModel)]="discount" (ngModelChange)="recalcular()">
            </div>
          </div>

          <p class="baixa-saldo" style="margin-top:10px;">
            Total devido: <strong>R$ {{ totalDevido() | number:'1.2-2':'pt-BR' }}</strong>
            @if (acrescimo() !== 0) {
              <span class="baixa-hint" style="display:block;margin-top:2px;">
                saldo R$ {{ balance | number:'1.2-2':'pt-BR' }}
                {{ acrescimo() > 0 ? '+' : '−' }} R$ {{ (acrescimo() > 0 ? acrescimo() : -acrescimo()) | number:'1.2-2':'pt-BR' }}
              </span>
            }
          </p>

          <label class="baixa-lbl">Valor {{ kind === 'receber' ? 'recebido' : 'pago' }}</label>
          <input class="baixa-input" type="number" step="0.01" [(ngModel)]="amount" min="0.01">
          <p class="baixa-hint">Informe um valor menor para baixa parcial. Máximo: R$ {{ totalDevido() | number:'1.2-2':'pt-BR' }}.</p>

          <label class="baixa-lbl">Data</label>
          <input class="baixa-input" type="date" [(ngModel)]="date">

          @if (contas.length) {
            <label class="baixa-lbl">Conta bancária</label>
            <select class="baixa-input" [(ngModel)]="bankAccountId">
              <option [ngValue]="null">Selecione (opcional)</option>
              @for (c of contas; track c.id) { <option [ngValue]="c.id">{{ c.label }}</option> }
            </select>
          }

          <label class="baixa-lbl">Observação (opcional)</label>
          <input class="baixa-input" type="text" [(ngModel)]="note" placeholder="Ex.: PIX, TED...">

          @if (error()) { <p class="baixa-err">{{ error() }}</p> }
        </div>
        <div class="baixa-foot">
          <button type="button" class="baixa-btn baixa-btn--ghost" (click)="onCancel()">Cancelar</button>
          <button type="button" class="baixa-btn baixa-btn--solid" [disabled]="busy" (click)="onConfirm()">
            {{ busy ? 'Salvando...' : 'Confirmar baixa' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .baixa-backdrop { position: fixed; inset: 0; background: rgba(17,24,39,.45); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 20px; }
    .baixa-modal { background: var(--surface-primary,#fff); border-radius: 16px; width: 100%; max-width: 460px; box-shadow: 0 24px 60px rgba(0,0,0,.25); }
    .baixa-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-border,#E5E7EB); }
    .baixa-head h2 { font-size: 16px; font-weight: 700; color: var(--text-primary,#111827); }
    .baixa-x { border: none; background: transparent; font-size: 15px; cursor: pointer; color: var(--text-muted,#6B7280); }
    .baixa-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; }
    .baixa-title { font-size: 13.5px; color: var(--text-secondary,#4B5563); }
    .baixa-saldo { font-size: 13.5px; color: var(--text-primary,#111827); margin-bottom: 8px; }
    .baixa-lbl { font-size: 12.5px; font-weight: 600; color: var(--text-secondary,#4B5563); margin-top: 8px; }
    .baixa-input { width: 100%; padding: 10px 14px; border: 1.5px solid var(--surface-border-mid,#E5E7EB); border-radius: 50px; font-size: 13.5px; outline: none; }
    .baixa-input:focus { border-color: var(--brand-purple-mid,#7C3AED); box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
    .baixa-hint { font-size: 11px; color: var(--text-muted,#9CA3AF); margin-top: 2px; }
    .baixa-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
    .baixa-err { font-size: 12.5px; color: #DC2626; margin-top: 8px; }
    .baixa-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--surface-border,#E5E7EB); }
    .baixa-btn { padding: 9px 18px; border-radius: 50px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: 1.5px solid transparent; }
    .baixa-btn--ghost { background: transparent; color: var(--brand-orange,#F97316); border-color: var(--brand-orange,#F97316); }
    .baixa-btn--solid { background: var(--brand-orange,#F97316); color: #fff; }
    .baixa-btn--solid:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class BaixaModalComponent {
  @Input() title = '';
  @Input() balance = 0;
  @Input() kind: 'pagar' | 'receber' = 'pagar';
  @Input() busy = false;
  /** CP-09 / CR-03: contas bancárias para o seletor (vazio esconde o campo). */
  @Input() contas: BaixaConta[] = [];
  /** D6: parcelas do título (vazio esconde o seletor e baixa o título inteiro). */
  @Input() parcelas: BaixaParcela[] = [];
  @Output() confirm = new EventEmitter<BaixaResult>();
  @Output() cancel = new EventEmitter<void>();

  amount: number | null = null;
  date = new Date().toISOString().slice(0, 10);
  note = '';
  bankAccountId: number | null = null;
  installmentId: number | null = null;
  interest = 0;
  fine = 0;
  discount = 0;
  readonly error = signal<string | null>(null);

  /** D6: saldo que resta numa parcela. */
  saldoDaParcela(p: BaixaParcela): number {
    return Math.round((p.amount - (p.amountPaid ?? 0)) * 100) / 100;
  }

  /** D6: o saldo de referência é o da parcela escolhida, ou o do título. */
  saldoBase(): number {
    if (this.installmentId == null) return this.balance;
    const p = this.parcelas.find(x => x.id === this.installmentId);
    return p ? this.saldoDaParcela(p) : this.balance;
  }

  /** Juros + multa − desconto. */
  acrescimo(): number {
    const n = (v: any) => Math.max(0, Number(v) || 0);
    return Math.round((n(this.interest) + n(this.fine) - n(this.discount)) * 100) / 100;
  }

  /** Saldo (do título ou da parcela) + acréscimos. É o teto da baixa. */
  totalDevido(): number {
    return Math.round((this.saldoBase() + this.acrescimo()) * 100) / 100;
  }

  /** Mantém o valor colado no total devido enquanto o usuário não o edita. */
  recalcular(): void {
    this.amount = this.totalDevido();
  }

  /** D6: trocar de parcela muda o saldo de referência e o valor sugerido. */
  onParcelaChange(): void {
    this.error.set(null);
    this.recalcular();
  }

  ngOnChanges(): void {
    // Ao abrir, sugere o total devido como valor (quitação); o usuário reduz p/ parcial.
    if (this.amount == null && this.balance > 0) this.amount = this.totalDevido();
  }

  onConfirm(): void {
    const value = Number(this.amount);
    const devido = this.totalDevido();
    if (!value || value <= 0) { this.error.set('Informe um valor maior que zero.'); return; }
    if (value > devido + 0.005) { this.error.set(`Valor maior que o total devido (R$ ${devido.toFixed(2)}).`); return; }
    // O que sobra depois dos acréscimos é o que amortiza o título.
    if (value - this.acrescimo() <= 0.005) {
      this.error.set('O valor informado não cobre os juros e a multa.');
      return;
    }
    if (!this.date) { this.error.set('Informe a data.'); return; }
    this.error.set(null);
    this.confirm.emit({
      amount: value,
      date: this.date,
      note: this.note || undefined,
      bankAccountId: this.bankAccountId ?? undefined,
      interest: Number(this.interest) || 0,
      fine: Number(this.fine) || 0,
      discount: Number(this.discount) || 0,
      installmentId: this.installmentId ?? undefined,
    });
  }

  onCancel(): void { this.cancel.emit(); }
}
