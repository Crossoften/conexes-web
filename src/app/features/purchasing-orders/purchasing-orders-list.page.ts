// src/app/features/purchasing-orders/purchasing-orders-list.page.ts
import { Component, computed, inject } from '@angular/core';
import { PurchasingOrdersStore } from './purchasing-orders.store';
import { OrderRow, ORDER_STATUS_CONFIG } from './purchasing-orders.model';
import { OrderDetailModalComponent } from './components/order-detail.modal';

@Component({
  selector: 'app-purchasing-orders-list',
  standalone: true,
  imports: [OrderDetailModalComponent],
  providers: [PurchasingOrdersStore],
  templateUrl: './purchasing-orders-list.page.html',
  styleUrl: './purchasing-orders-list.page.scss',
})
export class PurchasingOrdersListPage {
  readonly store = inject(PurchasingOrdersStore);
  readonly statusConfig = ORDER_STATUS_CONFIG;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.store.total() / this.store.pagination().pageSize)),
  );

  readonly pageNumbers = computed((): number[] => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  constructor() {
    this.store.load();
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  goToPage(p: number): void { this.store.setPage(p); }

  view(item: OrderRow): void { this.store.openDetail(item.apiId); }

  // CP-33: o modal já reflete o pedido atualizado (resposta do recebimento);
  // aqui só recarregamos a lista para atualizar o status da linha.
  onReceived(_orderId: number): void {
    this.store.load();
  }

  statusLabel(status: string): string {
    if (!status) return '—';
    return this.statusConfig[status]?.label ?? status;
  }

  statusVariant(status: string): string {
    if (!status) return 'neutral';
    return this.statusConfig[status]?.variant ?? 'neutral';
  }
}
