// src/app/features/accounts-receivable/accounts-receivable-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AccountsReceivableStore } from './accounts-receivable.store';
import { ReceivableAccount, ReceivableFilters } from './accounts-receivable.model';

@Component({
  selector: 'app-accounts-receivable-list',
  standalone: true,
  imports: [FormsModule, NgClass],
  providers: [AccountsReceivableStore],
  templateUrl: './accounts-receivable-list.page.html',
  styleUrl: './accounts-receivable-list.page.scss',
})
export class AccountsReceivableListPage {
  readonly store = inject(AccountsReceivableStore);

  readonly viewOptions = [
    { label: 'Captura de Nota Fiscal', value: 'CAPTURA_NF' },
    { label: 'Lançamentos', value: 'LANCAMENTOS' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  localFilters: ReceivableFilters = {
    status: '', dateRange: '', contractor: ''
  };

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

  openFilters() {
    this.localFilters = { ...this.store.filters() };
    this.store.toggleFilterModal(true);
  }

  closeFilters() {
    this.store.toggleFilterModal(false);
  }

  clearFilters() {
    this.store.clearFilters();
    this.localFilters = { ...this.store.filters() };
  }

  applyFilters() {
    this.store.applyFilters({ ...this.localFilters });
  }

  getSortState(col: keyof ReceivableAccount): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }
}