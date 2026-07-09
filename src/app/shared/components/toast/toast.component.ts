// src/app/shared/components/toast/toast.component.ts
//
// Host visual das notificações. Basta incluir <app-toast /> uma vez na página.
// Lê a fila do NotificationService (signal) e renderiza os toasts empilhados.

import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (t of notify.toasts(); track t.id) {
        <div class="toast" [ngClass]="'toast--' + t.type">
          <span class="toast__msg">{{ t.message }}</span>
          <button class="toast__close" type="button" aria-label="Fechar" (click)="notify.dismiss(t.id)">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; top: 20px; right: 20px; z-index: 9999;
      display: flex; flex-direction: column; gap: 10px;
      max-width: min(92vw, 420px);
    }
    .toast {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      background: var(--surface-primary, #fff);
      border: 1px solid var(--surface-border, #e5e7eb);
      border-left: 4px solid var(--text-muted, #9ca3af);
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      font-size: 14px; color: var(--text-primary, #111827);
      animation: toast-in 160ms ease-out;
    }
    .toast--success { border-left-color: #16a34a; }
    .toast--error   { border-left-color: #dc2626; }
    .toast--info    { border-left-color: #2563eb; }
    .toast__msg   { flex: 1; line-height: 1.35; }
    .toast__close {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted, #9ca3af); padding: 0; display: inline-flex;
    }
    .toast__close:hover { color: var(--text-primary, #111827); }
    @keyframes toast-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
  `],
})
export class ToastComponent {
  readonly notify = inject(NotificationService);
}
