// src/app/features/purchasing-management/purchasing-management-list.page.ts
import { Component, inject, computed, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { PurchasingManagementStore } from './purchasing-management.store';
import { PurchasingReq, ReqStatus, REQ_STATUS_CONFIG } from './purchasing-management.model';
import { RouterLink } from "@angular/router";
import { PurchaseRequestDetailModalComponent } from '../purchases/components/purchase-request-detail.modal';
import { PurchaseRequestActionModalComponent } from '../purchases/components/purchase-request-action.modal';
import { PurchaseActionKind, PurchaseActionResult } from '../purchases/purchases.model';
import { PurchasePermissionsService } from '../purchases/purchase-permissions.service';

@Component({
  selector: 'app-purchasing-management-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, PurchaseRequestDetailModalComponent, PurchaseRequestActionModalComponent],
  providers: [PurchasingManagementStore],
  templateUrl: './purchasing-management-list.page.html',
  styleUrl: './purchasing-management-list.page.scss',
})
export class PurchasingManagementListPage {
  readonly store = inject(PurchasingManagementStore);
  readonly perms = inject(PurchasePermissionsService);
  readonly statusConfig = REQ_STATUS_CONFIG;

  constructor() {
    this.store.load();
  }

  readonly stageOptions = [
    { label: 'Selecione a etapa', value: '' },
    { label: 'Etapa 1', value: '1' },
    { label: 'Etapa 2', value: '2' },
    { label: 'Etapa 3', value: '3' },
    { label: 'Etapa 4', value: '4' },
    { label: 'Etapa 5', value: '5' },
    { label: 'Etapa 6', value: '6' },
  ];

  readonly statusOptions: { label: string; value: ReqStatus | '' }[] = [
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

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.store.filteredTotal() / this.store.pagination().pageSize)));

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total = this.totalPages();
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

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof PurchasingReq): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── Ações ─────────────────────────────────────────────────────────────────
  readonly menuOpenId = signal<string | null>(null);
  readonly menuPos    = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  @HostListener('document:click')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  closeMenu() {
    this.menuOpenId.set(null);
  }

  toggleMenu(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (this.menuOpenId() === id) {
      this.menuOpenId.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    // Menu de ~220px alinhado à direita do botão, logo abaixo (position: fixed).
    this.menuPos.set({ top: rect.bottom + 6, left: Math.max(8, rect.right - 220) });
    this.menuOpenId.set(id);
  }

  openDetail(item: PurchasingReq) {
    this.store.openDetail(item.apiId);
  }

  openAction(kind: PurchaseActionKind, item: PurchasingReq) {
    this.menuOpenId.set(null);
    this.store.openAction(kind, item.apiId);
  }

  onActionConfirm(result: PurchaseActionResult) {
    this.store.submitAction(result);
  }

  copy(item: PurchasingReq) {
    // CMP-13: confirmação antes de duplicar (evita duplicação por clique acidental).
    if (!confirm('Duplicar esta requisição?')) return;
    this.store.copy(item.apiId);
  }

  onRemove(apiId: number) {
    this.store.remove(apiId);
  }
}