// src/app/shared/components/confirm-dialog.component.ts
// item 11 (reteste 22.09): diálogo de confirmação padrão para ações que avançam
// etapa ou alteram dados/status (aprovar, enviar, concluir, duplicar, excluir).
// Reutilizável — usado na lista de Compras e no fluxo de Cotação.
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="cd-overlay" (click)="cancel.emit()">
      <div class="cd-box" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <h3 class="cd-title">{{ title }}</h3>
        <p class="cd-message">{{ message }}</p>
        <div class="cd-actions">
          <button type="button" class="cd-btn cd-btn--ghost" [disabled]="busy" (click)="cancel.emit()">{{ cancelLabel }}</button>
          <button type="button" class="cd-btn" [class.cd-btn--danger]="danger" [class.cd-btn--primary]="!danger" [disabled]="busy" (click)="confirm.emit()">
            {{ busy ? 'Processando…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cd-overlay { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,.45); padding: 16px; }
    .cd-box { width: 100%; max-width: 420px; background: #fff; border-radius: 14px; box-shadow: 0 20px 48px rgba(0,0,0,.2); padding: 22px 22px 18px; animation: cd-in .16s ease-out; }
    .cd-title { margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #111827; }
    .cd-message { margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #4B5563; }
    .cd-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .cd-btn { padding: 9px 18px; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: filter .15s, background .15s; }
    .cd-btn:disabled { opacity: .6; cursor: not-allowed; }
    .cd-btn--ghost { background: #fff; color: #4B5563; border-color: #E5E7EB; }
    .cd-btn--ghost:hover:not(:disabled) { background: #F3F4F6; }
    .cd-btn--primary { background: var(--brand-orange, #F97316); color: #fff; }
    .cd-btn--primary:hover:not(:disabled) { filter: brightness(1.06); }
    .cd-btn--danger { background: #DC2626; color: #fff; }
    .cd-btn--danger:hover:not(:disabled) { filter: brightness(1.06); }
    @keyframes cd-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirmar ação';
  @Input() message = 'Deseja continuar?';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Voltar';
  @Input() danger = false;
  @Input() busy = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();
}
