// src/app/features/approval-tiers/approval-tiers-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApprovalTiersStore } from './approval-tiers.store';
import { ApprovalTier, ApprovalTierPayload, approvalPurchaseRoleLabel } from './approval-tiers.model';
import { ApprovalTierDetailModalComponent } from './components/approval-tier-detail.modal';

@Component({
  selector: 'app-approval-tiers-list',
  standalone: true,
  imports: [FormsModule, NgClass, CurrencyPipe, RouterLink, ApprovalTierDetailModalComponent],
  providers: [ApprovalTiersStore],
  templateUrl: './approval-tiers-list.page.html',
  styleUrl: './approval-tiers-list.page.scss',
})
export class ApprovalTiersListPage implements OnInit {
  readonly store = inject(ApprovalTiersStore);

  // Filtro de status oculto: o back-end de /v1/approval-limits ainda não expõe
  // `status` (ver B-AL-05). Reativar quando o campo existir no contrato.

  readonly pageSizeOptions = [10, 25, 50];

  roleLabel(role: string | null | undefined): string {
    return approvalPurchaseRoleLabel(role);
  }

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

  ngOnInit(): void {
    this.store.load();
  }

  onTierSave(event: { id: number; payload: ApprovalTierPayload }): void {
    this.store.saveTier(event.id, event.payload);
  }

  onExport(): void {
    this.store.exportExcel();
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
}