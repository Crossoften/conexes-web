// src/app/shared/components/renegotiate-modal/renegotiate-modal.component.ts
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

export interface RenegotiateResult {
  interest?: number;
  fine?: number;
  discount?: number;
  installmentsCount: number;
  firstDueDate: string;
  note?: string;
}

// Modal de renegociação (FIN-03) — incide sobre o saldo pendente, incorpora
// juros/multa/desconto e gera um novo título (opcionalmente parcelado).
@Component({
  selector: 'app-renegotiate-modal',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="rng-backdrop" (click)="onCancel()">
      <div class="rng-modal" (click)="$event.stopPropagation()">
        <div class="rng-head">
          <h2>Renegociar título</h2>
          <button type="button" class="rng-x" (click)="onCancel()" aria-label="Fechar">✕</button>
        </div>
        <div class="rng-body">
          <p class="rng-title">{{ title }}</p>
          <p class="rng-saldo">Saldo pendente: <strong>R$ {{ balance | number:'1.2-2':'pt-BR' }}</strong></p>

          <div class="rng-grid">
            <div><label class="rng-lbl">Juros</label><input class="rng-input" type="number" step="0.01" min="0" [(ngModel)]="interest"></div>
            <div><label class="rng-lbl">Multa</label><input class="rng-input" type="number" step="0.01" min="0" [(ngModel)]="fine"></div>
            <div><label class="rng-lbl">Desconto</label><input class="rng-input" type="number" step="0.01" min="0" [(ngModel)]="discount"></div>
          </div>

          <p class="rng-total">Novo total: <strong>R$ {{ newTotal() | number:'1.2-2':'pt-BR' }}</strong></p>

          <div class="rng-grid">
            <div><label class="rng-lbl">Parcelas</label>
              <select class="rng-input" [(ngModel)]="installmentsCount">
                <option [value]="1">1x (único)</option>
                @for (n of parcelas; track n) { <option [value]="n">{{ n }}x</option> }
              </select>
            </div>
            <div><label class="rng-lbl">1º vencimento</label><input class="rng-input" type="date" [(ngModel)]="firstDueDate"></div>
          </div>

          <label class="rng-lbl">Observação</label>
          <input class="rng-input" type="text" [(ngModel)]="note" placeholder="Motivo/condições do acordo">

          @if (error()) { <p class="rng-err">{{ error() }}</p> }
        </div>
        <div class="rng-foot">
          <button type="button" class="rng-btn rng-btn--ghost" (click)="onCancel()">Cancelar</button>
          <button type="button" class="rng-btn rng-btn--solid" [disabled]="busy" (click)="onConfirm()">{{ busy ? 'Salvando...' : 'Renegociar' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rng-backdrop { position: fixed; inset: 0; background: rgba(17,24,39,.45); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 20px; }
    .rng-modal { background: var(--surface-primary,#fff); border-radius: 16px; width: 100%; max-width: 520px; box-shadow: 0 24px 60px rgba(0,0,0,.25); }
    .rng-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-border,#E5E7EB); }
    .rng-head h2 { font-size: 16px; font-weight: 700; color: var(--text-primary,#111827); }
    .rng-x { border: none; background: transparent; font-size: 15px; cursor: pointer; color: var(--text-muted,#6B7280); }
    .rng-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 6px; }
    .rng-title { font-size: 13.5px; color: var(--text-secondary,#4B5563); }
    .rng-saldo { font-size: 13.5px; margin-bottom: 6px; }
    .rng-total { font-size: 13.5px; margin: 8px 0; color: var(--brand-purple-mid,#7C3AED); }
    .rng-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .rng-grid > div { display: flex; flex-direction: column; gap: 4px; }
    .rng-lbl { font-size: 12px; font-weight: 600; color: var(--text-secondary,#4B5563); margin-top: 6px; }
    .rng-input { width: 100%; padding: 9px 12px; border: 1.5px solid var(--surface-border-mid,#E5E7EB); border-radius: 50px; font-size: 13px; outline: none; }
    .rng-input:focus { border-color: var(--brand-purple-mid,#7C3AED); box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
    .rng-err { font-size: 12.5px; color: #DC2626; margin-top: 6px; }
    .rng-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--surface-border,#E5E7EB); }
    .rng-btn { padding: 9px 18px; border-radius: 50px; font-size: 13.5px; font-weight: 600; cursor: pointer; border: 1.5px solid transparent; }
    .rng-btn--ghost { background: transparent; color: var(--brand-orange,#F97316); border-color: var(--brand-orange,#F97316); }
    .rng-btn--solid { background: var(--brand-orange,#F97316); color: #fff; }
    .rng-btn--solid:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class RenegotiateModalComponent {
  @Input() title = '';
  @Input() balance = 0;
  @Input() busy = false;
  @Output() confirm = new EventEmitter<RenegotiateResult>();
  @Output() cancel = new EventEmitter<void>();

  readonly parcelas = Array.from({ length: 23 }, (_, i) => i + 2);
  interest: number | null = null;
  fine: number | null = null;
  discount: number | null = null;
  installmentsCount = 1;
  firstDueDate = new Date().toISOString().slice(0, 10);
  note = '';
  readonly error = signal<string | null>(null);

  newTotal(): number {
    return Math.max(0, this.balance + Number(this.interest || 0) + Number(this.fine || 0) - Number(this.discount || 0));
  }

  onConfirm(): void {
    if (this.newTotal() <= 0) { this.error.set('O novo total precisa ser maior que zero.'); return; }
    if (!this.firstDueDate) { this.error.set('Informe o 1º vencimento.'); return; }
    this.error.set(null);
    this.confirm.emit({
      interest: this.interest ? Number(this.interest) : undefined,
      fine: this.fine ? Number(this.fine) : undefined,
      discount: this.discount ? Number(this.discount) : undefined,
      installmentsCount: Number(this.installmentsCount) || 1,
      firstDueDate: this.firstDueDate,
      note: this.note || undefined,
    });
  }

  onCancel(): void { this.cancel.emit(); }
}
