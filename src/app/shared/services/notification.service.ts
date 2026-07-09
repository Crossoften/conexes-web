// src/app/shared/services/notification.service.ts
//
// Serviço de notificações (toast) compartilhado. Signal-based, sem dependências.
// Uso: inject(NotificationService).error('...') / .success('...').
// Renderizado por <app-toast /> (shared/components/toast).

import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id:      number;
  message: string;
  type:    ToastType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void { this.push(message, 'success'); }
  error(message: string): void   { this.push(message, 'error'); }
  info(message: string): void    { this.push(message, 'info'); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(message: string, type: ToastType): void {
    const id = ++this.seq;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
