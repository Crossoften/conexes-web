// src/app/features/accounts-payable/accounts-payable-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AccountsPayableStore } from './accounts-payable.store';
import { PayableAccount, AdvancedFilters } from './accounts-payable.model';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-accounts-payable-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [AccountsPayableStore],
  templateUrl: './accounts-payable-list.page.html',
  styleUrl: './accounts-payable-list.page.scss',
})
export class AccountsPayableListPage {
  readonly store = inject(AccountsPayableStore);

  readonly viewOptions = [
    { label: 'Lançamentos', value: 'LANÇAMENTOS' },
    { label: 'Visão 2', value: 'VISA0_2' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  // Estado local para os inputs do modal antes de aplicar
  localFilters: AdvancedFilters = {
    issue: '', status: '', dateRange: '', supplier: '', remittanceStatus: '', expenseType: '',
    paymentType: '', contract: '', requisition: '', writeOffAccount: '', payingAccount: '',
    categoryAccount: '', costCenter: '', subProject: ''
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
    this.localFilters = { ...this.store.filters() }; // Copia os filtros atuais
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

  getSortState(col: keyof PayableAccount): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }
}