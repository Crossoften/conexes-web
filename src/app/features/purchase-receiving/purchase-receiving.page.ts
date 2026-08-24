// src/app/features/purchase-receiving/purchase-receiving.page.ts
// Feature 2 (front): Recebimento de Pedidos de Compra.
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-purchase-receiving',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './purchase-receiving.page.html',
  styleUrl: './purchase-receiving.page.scss',
})
export class PurchaseReceivingPage implements OnInit {
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  private api = environment.apiUrl + '/v1';

  readonly orders = signal<any[]>([]);
  readonly detail = signal<any | null>(null);
  readonly loadingList = signal(false);
  readonly saving = signal(false);
  readonly invoiceNumber = signal('');
  readonly note = signal('');
  // quantidade a receber por item (id -> valor digitado)
  readonly toReceive = signal<Record<number, number>>({});

  private readonly STATUS: Record<string, { label: string; cls: string }> = {
    Open:         { label: 'Aberto',                 cls: 'st--open' },
    InProgress:   { label: 'Parcialmente recebido',  cls: 'st--part' },
    Completed:    { label: 'Recebido',               cls: 'st--done' },
    Cancelled:    { label: 'Cancelado',              cls: 'st--cancel' },
  };
  statusLabel(s: string): string { return this.STATUS[s]?.label ?? s; }
  statusClass(s: string): string { return this.STATUS[s]?.cls ?? ''; }

  ngOnInit(): void { this.loadList(); }

  loadList(): void {
    this.loadingList.set(true);
    this.http.get<any>(`${this.api}/purchase-orders?take=100`).subscribe({
      next: r => { this.orders.set(r?.data ?? []); this.loadingList.set(false); },
      error: () => { this.loadingList.set(false); },
    });
  }

  open(order: any): void {
    this.http.get<any>(`${this.api}/purchase-orders/${order.id}`).subscribe({
      next: d => { this.detail.set(d); this.toReceive.set({}); this.invoiceNumber.set(''); this.note.set(''); },
      error: () => this.notify.error('Não foi possível abrir o pedido.'),
    });
  }

  close(): void { this.detail.set(null); }

  setQty(itemId: number, value: any): void {
    const n = Number(value);
    this.toReceive.update(m => ({ ...m, [itemId]: isNaN(n) ? 0 : n }));
  }

  fillPending(item: any): void {
    this.toReceive.update(m => ({ ...m, [item.id]: item.pendingQty }));
  }

  private receiveItems() {
    const m = this.toReceive();
    return Object.entries(m)
      .map(([id, q]) => ({ orderItemId: Number(id), quantity: Number(q) }))
      .filter(x => x.quantity > 0);
  }

  submit(): void {
    const d = this.detail();
    if (!d) return;
    const items = this.receiveItems();
    if (!items.length) { this.notify.error('Informe a quantidade recebida de ao menos um item.'); return; }
    this.saving.set(true);
    this.http.post<any>(`${this.api}/purchase-orders/${d.id}/receipts`, {
      invoiceNumber: this.invoiceNumber() || undefined,
      note: this.note() || undefined,
      items,
    }).subscribe({
      next: updated => {
        this.saving.set(false);
        this.notify.success('Recebimento registrado.');
        this.detail.set(updated);
        this.toReceive.set({}); this.invoiceNumber.set(''); this.note.set('');
        this.loadList();
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err?.error?.message ?? 'Não foi possível registrar o recebimento.');
      },
    });
  }

  brl(v: number): string { return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
}
