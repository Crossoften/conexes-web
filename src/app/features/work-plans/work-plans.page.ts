// src/app/features/work-plans/work-plans.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkPlansStore } from './work-plans.store';
import { WORK_PLAN_STATUS_CONFIG } from './work-plans.model';

@Component({
  selector: 'app-work-plans',
  standalone: true,
  imports: [NgClass, RouterLink],
  providers: [WorkPlansStore],
  templateUrl: './work-plans.page.html',
  styleUrl: './work-plans.page.scss',
})
export class WorkPlansPage implements OnInit {
  readonly store = inject(WorkPlansStore);

  readonly statusConfig = WORK_PLAN_STATUS_CONFIG;

  readonly pageSizeOptions = [10, 25, 50];

  readonly statusOptions = [
    { label: 'Selecione o status',   value: ''                 },
    { label: 'Rascunho',             value: 'Draft'            },
    { label: 'Aguardando análise',   value: 'AwaitingApproval' },
    { label: 'Ativo',                value: 'Active'           },
    { label: 'Concluído',            value: 'Completed'        },
    { label: 'Cancelado',            value: 'Cancelled'        },
  ];

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
    this.store.loadDashboard();
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: string): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }
}
