// src/app/features/agencies/agencies-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AgenciesStore } from './agencies.store';
import { Agency, AgencyStatus, AgencyType, AGENCY_STATUS_CONFIG } from './agencies.model';

@Component({
  selector: 'app-agencies-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [AgenciesStore],
  templateUrl: './agencies-list.page.html',
  styleUrl: './agencies-list.page.scss',
})
export class AgenciesListPage {
  readonly store        = inject(AgenciesStore);
  readonly router       = inject(Router);
  readonly statusConfig = AGENCY_STATUS_CONFIG;

  readonly statusOptions: { label: string; value: AgencyStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Ativo',              value: 'ACTIVE' },
    { label: 'Inativo',            value: 'INACTIVE' },
  ];

  readonly typeOptions: { label: string; value: AgencyType | '' }[] = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'Público',          value: 'PUBLIC' },
    { label: 'Privado',          value: 'PRIVATE' },
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

  getSortState(col: keyof Agency): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Agency) { return item.id; }
}