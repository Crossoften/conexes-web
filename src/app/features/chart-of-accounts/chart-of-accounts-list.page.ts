// src/app/features/chart-of-accounts/chart-of-accounts-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AccountsStore } from './chart-of-accounts.store';
import { Account, AccountStatus, AccountType, ACCOUNT_STATUS_CONFIG } from './chart-of-accounts.model';

@Component({
  selector: 'app-chart-of-accounts-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [AccountsStore],
  templateUrl: './chart-of-accounts-list.page.html',
  styleUrl: './chart-of-accounts-list.page.scss',
})
export class ChartOfAccountsListPage {
  readonly store        = inject(AccountsStore);
  readonly router       = inject(Router);
  readonly statusConfig = ACCOUNT_STATUS_CONFIG;

  readonly statusOptions: { label: string; value: AccountStatus | '' }[] = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'ACTIVE'   },
    { label: 'Inativo',            value: 'INACTIVE' },
  ];

  readonly typeOptions: { label: string; value: AccountType | '' }[] = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'T',                value: 'T' },
    { label: 'A',                value: 'A' },
    { label: 'S',                value: 'S' },
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

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof Account): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Account) { return item.id; }
}
