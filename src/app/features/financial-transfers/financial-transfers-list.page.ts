// src/app/features/financial-transfers/financial-transfers-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { FinancialTransfersStore } from './financial-transfers.store';
import { FinancialTransfer, TransferStatus, TransferType, TransferView } from './financial-transfers.model';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-financial-transfers-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [FinancialTransfersStore],
  templateUrl: './financial-transfers-list.page.html',
  styleUrl: './financial-transfers-list.page.scss',
})
export class FinancialTransfersListPage implements OnInit {
  readonly store = inject(FinancialTransfersStore);

  ngOnInit(): void {
    this.store.load();
  }

  readonly viewOptions: { label: string; value: TransferView }[] = [
    { label: 'Transferencias', value: 'TRANSFERS' },
    { label: 'Lançamentos', value: 'ENTRIES' },
  ];

  readonly statusOptions: { label: string; value: TransferStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Concluído', value: 'COMPLETED' },
    { label: 'Pendente', value: 'PENDING' },
  ];

  readonly typeOptions: { label: string; value: TransferType | '' }[] = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'PIX', value: 'PIX' },
    { label: 'TED', value: 'TED' },
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

  getSortState(col: keyof FinancialTransfer): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }
}