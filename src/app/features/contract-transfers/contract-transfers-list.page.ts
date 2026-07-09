// src/app/features/contract-transfers/contract-transfers-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContractTransfersStore } from './contract-transfers.store';
import { PartnershipRow, PartnershipStatus } from './contract-transfers.model';

@Component({
  selector: 'app-contract-transfers-list',
  standalone: true,
  imports: [NgClass, RouterLink],
  providers: [ContractTransfersStore],
  templateUrl: './contract-transfers-list.page.html',
  styleUrl: './contract-transfers-list.page.scss',
})
export class ContractTransfersListPage implements OnInit {
  readonly store = inject(ContractTransfersStore);

  readonly statusOptions: { label: string; value: PartnershipStatus | '' }[] = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Pendente',           value: 'Pending'  },
    { label: 'Inativo',            value: 'Inactive' },
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

  ngOnInit(): void {
    this.store.load();
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof PartnershipRow): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }
}
