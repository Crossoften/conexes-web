// src/app/features/purchasing-orders/purchasing-orders-list.page.ts
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PurchasingOrdersStore } from './purchasing-orders.store';
import { OrderRow, ORDER_STATUS_CONFIG } from './purchasing-orders.model';
import { OrderDetailModalComponent } from './components/order-detail.modal';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { PurchasesService } from '../purchases/purchases.service';

@Component({
  selector: 'app-purchasing-orders-list',
  standalone: true,
  imports: [OrderDetailModalComponent, TooltipDirective],
  providers: [PurchasingOrdersStore],
  templateUrl: './purchasing-orders-list.page.html',
  styleUrl: './purchasing-orders-list.page.scss',
})
export class PurchasingOrdersListPage implements OnInit {
  readonly store = inject(PurchasingOrdersStore);
  private readonly purchasesSvc = inject(PurchasesService);
  private readonly route = inject(ActivatedRoute);
  readonly statusConfig = ORDER_STATUS_CONFIG;

  /**
   * COM-E6 / I026 (decisão D2): o Pedido é o registro central, e a Etapa 6 leva
   * até ele. Sem ler este parâmetro, o link da Etapa 6 só abria a LISTA e quem
   * clicou tinha de procurar o pedido na mão — meio caminho.
   */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('order'));
    if (Number.isInteger(id) && id > 0) this.store.openDetail(id);
  }

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

  // DOC-PED: exporta o Pedido de Compra em PDF (padrão do modelo).
  pdf(item: OrderRow): void {
    this.purchasesSvc.generateOrderPdf(item.apiId).subscribe({
      next: blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `pedido-${item.apiId}.pdf`; a.click(); URL.revokeObjectURL(url); },
      error: () => {},
    });
  }

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
