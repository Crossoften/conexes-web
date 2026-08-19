// src/app/shared/components/baixa-modal/baixa-modal.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

export interface BaixaResult {
  amount: number;
  date: string;
  note?: string;
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
          <p class="baixa-saldo">Saldo em aberto: <strong>R$ {{ balance | number:'1.2-2':'pt-BR' }}</strong></p>

          <label class="baixa-lbl">Valor {{ kind === 'receber' ? 'recebido' : 'pago' }}</label>
          <input class="baixa-input" type="number" step="0.01" [(ngModel)]="amount" [max]="balance" min="0.01">
          <p class="baixa-hint">Informe um valor menor para baixa parcial. Máximo: R$ {{ balance | number:'1.2-2':'pt-BR' }}.</p>

          <label class="baixa-lbl">Data</label>
          <input class="baixa-input" type="date" [(ngModel)]="date">

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
  @Output() confirm = new EventEmitter<BaixaResult>();
  @Output() cancel = new EventEmitter<void>();

  amount: number | null = null;
  date = new Date().toISOString().slice(0, 10);
  note = '';
  readonly error = signal<string | null>(null);

  ngOnChanges(): void {
    // Ao abrir, sugere o saldo total como valor (quitação); o usuário reduz p/ parcial.
    if (this.amount == null && this.balance > 0) this.amount = Number(this.balance.toFixed(2));
  }

  onConfirm(): void {
    const value = Number(this.amount);
    if (!value || value <= 0) { this.error.set('Informe um valor maior que zero.'); return; }
    if (value > this.balance + 0.005) { this.error.set('Valor maior que o saldo em aberto.'); return; }
    if (!this.date) { this.error.set('Informe a data.'); return; }
    this.error.set(null);
    this.confirm.emit({ amount: value, date: this.date, note: this.note || undefined });
  }

  onCancel(): void { this.cancel.emit(); }
}
