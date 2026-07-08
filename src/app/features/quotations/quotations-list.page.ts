// src/app/features/quotations/quotations-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotationsStore } from './quotations.store';
import { Quotation, REQ_STATUS_CONFIG } from './quotations.model';
import { PurchaseRequestStatus, PurchaseActionKind, PurchaseActionResult } from '../purchases/purchases.model';
import { PurchaseRequestDetailModalComponent } from '../purchases/components/purchase-request-detail.modal';
import { PurchaseRequestActionModalComponent } from '../purchases/components/purchase-request-action.modal';

@Component({
  selector: 'app-quotations-list',
  standalone: true,
  imports: [FormsModule, NgClass, PurchaseRequestDetailModalComponent, PurchaseRequestActionModalComponent],
  providers: [QuotationsStore],
  templateUrl: './quotations-list.page.html',
  styleUrl: './quotations-list.page.scss',
})
export class QuotationsListPage {
  readonly store     = inject(QuotationsStore);
  readonly route     = inject(ActivatedRoute);
  private  router     = inject(Router);
  readonly reqConfig = REQ_STATUS_CONFIG;

  /** 0..5 = Etapas 1..6; 6 = Histórico. */
  readonly routeStage: number = this.route.snapshot.data['stage'] ?? 0;

  readonly sectionTitle = computed(() => this.route.snapshot.data['title'] ?? 'Requisições');

  // ── Ações disponíveis por etapa (conforme fluxo de compras) ────────────────
  readonly canApprove = this.routeStage === 1 || this.routeStage === 3; // Etapas 2 e 4
  readonly canReject  = this.routeStage === 1 || this.routeStage === 3;
  readonly canCancel  = this.routeStage === 0 || this.routeStage === 2; // Etapas 1 e 3
  readonly canCopy    = this.routeStage === 0 || this.routeStage === 2;
  readonly canExcel   = this.routeStage === 0 || this.routeStage === 2;
  readonly canDelete  = this.routeStage === 0;                          // Etapa 1 (rascunho)
  readonly canEdit    = this.routeStage === 0;                          // Etapa 1

  readonly statusOptions: { label: string; value: PurchaseRequestStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Rascunho',             value: 'Draft' },
    { label: 'Aguardando aprovação', value: 'AwaitingApproval' },
    { label: 'Cotação',              value: 'Quotation' },
    { label: 'Cotação em aprovação', value: 'QuotationApproval' },
    { label: 'Pedido',               value: 'Order' },
    { label: 'Concluído',            value: 'Completed' },
    { label: 'Cancelado',            value: 'Cancelled' },
    { label: 'Rejeitado',            value: 'Rejected' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.store.filteredTotal() / this.store.pagination().pageSize))
  );

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total   = this.totalPages();
    const current = this.store.pagination().page;
    const pages: (number | '...')[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  constructor() {
    this.store.load(this.routeStage);
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof Quotation): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Quotation) { return item.id; }

  // ── Handlers de ação ────────────────────────────────────────────────────────
  view(item: Quotation)    { this.store.openDetail(item.apiId); }
  edit(item: Quotation)    { this.router.navigate(['/quotations/edit', item.apiId]); }
  approve(item: Quotation) { this.store.approve(item.apiId); }
  reject(item: Quotation)  { this.store.openAction('reject', item.apiId); }
  cancel(item: Quotation)  { this.store.openAction('cancel', item.apiId); }
  copy(item: Quotation)    { this.store.copy(item.apiId); }
  excel(item: Quotation)   { this.store.exportExcel(item.apiId); }
  remove(item: Quotation)  { this.store.remove(item.apiId); }

  onActionConfirm(result: PurchaseActionResult) { this.store.submitAction(result); }
}
