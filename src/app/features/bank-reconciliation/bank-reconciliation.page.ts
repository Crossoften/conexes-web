// src/app/features/bank-reconciliation/bank-reconciliation.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { BankReconciliationStore } from './bank-reconciliation.store';

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [FormsModule, NgClass],
  providers: [BankReconciliationStore],
  templateUrl: './bank-reconciliation.page.html',
  styleUrl: './bank-reconciliation.page.scss',
})
export class BankReconciliationPage implements OnInit {
  readonly store = inject(BankReconciliationStore);

  ngOnInit(): void {
    this.store.load();
  }

  readonly periodOptions = [
    { label: 'Selecione o período', value: '' },
    { label: 'Este mês', value: 'THIS_MONTH' },
  ];

  readonly typeOptions = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'Crédito', value: 'CREDIT' },
    { label: 'Débito', value: 'DEBIT' },
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

  private globalSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private itemSearchTimer: ReturnType<typeof setTimeout> | null = null;

  onGlobalSearch(value: string) {
    if (this.globalSearchTimer) clearTimeout(this.globalSearchTimer);
    this.globalSearchTimer = setTimeout(() => this.store.setGlobalSearch(value), 400);
  }

  onItemSearch(value: string) {
    if (this.itemSearchTimer) clearTimeout(this.itemSearchTimer);
    this.itemSearchTimer = setTimeout(() => this.store.setItemSearch(value), 400);
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }
}