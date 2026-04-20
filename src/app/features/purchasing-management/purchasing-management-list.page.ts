// src/app/features/purchasing-management/purchasing-management-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { PurchasingManagementStore } from './purchasing-management.store';
import { PurchasingReq, ReqStatus, REQ_STATUS_CONFIG } from './purchasing-management.model';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-purchasing-management-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [PurchasingManagementStore],
  templateUrl: './purchasing-management-list.page.html',
  styleUrl: './purchasing-management-list.page.scss',
})
export class PurchasingManagementListPage {
  readonly store = inject(PurchasingManagementStore);
  readonly statusConfig = REQ_STATUS_CONFIG;

  readonly stageOptions = [
    { label: 'Selecione a etapa', value: '' },
    { label: 'Exemplo', value: 'Exemplo' },
  ];

  readonly typeOptions = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'Tipo A', value: 'TYPE_A' },
  ];

  readonly periodOptions = [
    { label: 'Selecione o período', value: '' },
    { label: 'Últimos 30 dias', value: '30D' },
  ];

  readonly statusOptions: { label: string; value: ReqStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Ativo', value: 'ACTIVE' },
    { label: 'Cancelada', value: 'CANCELLED' },
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
}