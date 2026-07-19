// src/app/features/approval-tiers/approval-tiers-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApprovalTiersStore } from './approval-tiers.store';
import { ApprovalTier, ApprovalTierPayload, APPROVAL_TIER_STATUS_CONFIG, APPROVAL_TIER_TYPE_LABELS } from './approval-tiers.model';
import { ApprovalTierDetailModalComponent } from './components/approval-tier-detail.modal';

const PURCHASE_ROLE_LABELS: Record<string, string> = {
  Requester: 'Solicitante', Buyer: 'Comprador', RequestSupervisor: 'Supervisor de Pedidos',
  PurchaseSupervisor: 'Supervisor de Compras', InvoiceReceiver: 'Recebedor de NF',
  Finance: 'Financeiro', Manager: 'Gerente',
};

@Component({
  selector: 'app-approval-tiers-list',
  standalone: true,
  imports: [FormsModule, NgClass, CurrencyPipe, RouterLink, ApprovalTierDetailModalComponent],
  providers: [ApprovalTiersStore],
  templateUrl: './approval-tiers-list.page.html',
  styleUrl: './approval-tiers-list.page.scss',
})
export class ApprovalTiersListPage implements OnInit {
  readonly store        = inject(ApprovalTiersStore);
  readonly statusConfig = APPROVAL_TIER_STATUS_CONFIG;

  readonly statusOptions = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Pendente',           value: 'Pending'  },
    { label: 'Inativo',            value: 'Inactive' },
  ];

  // AL-7: filtro de tipo (server-side).
  readonly typeOptions = [
    { label: 'Todos os tipos', value: ''           },
    { label: 'Compras',        value: 'COMPRAS'    },
    { label: 'Financeiro',     value: 'FINANCEIRO' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  /** AL-6: aprovador de destino selecionado no modal de transferência. */
  transferUserId = 0;

  // AL-7: total de páginas vem do back (server-side).
  readonly totalPages = computed(() => this.store.totalPages());

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

  ngOnInit(): void {
    this.store.load();
  }

  onTierSave(event: { id: number; payload: ApprovalTierPayload }): void {
    this.store.saveTier(event.id, event.payload);
  }

  onExport(): void {
    this.store.exportExcel();
  }

  /** AL-6: abre o modal de transferência zerando o aprovador de destino. */
  onOpenTransfer(item: ApprovalTier): void {
    this.transferUserId = 0;
    this.store.openTransfer(item);
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof ApprovalTier): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: ApprovalTier): number { return item.id; }

  typeLabel(item: ApprovalTier): string {
    return item.type ? (APPROVAL_TIER_TYPE_LABELS[item.type] ?? item.type) : '—';
  }

  roleLabel(item: ApprovalTier): string {
    if (item.type && item.type !== 'COMPRAS') return 'N/A';
    return item.purchaseRole ? (PURCHASE_ROLE_LABELS[item.purchaseRole] ?? item.purchaseRole) : '—';
  }

  levelLabel(item: ApprovalTier): string {
    if (item.isManagerTier) return 'Gestor';
    return item.level != null ? String(item.level) : '—';
  }
}