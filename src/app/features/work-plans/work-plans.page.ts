// src/app/features/work-plans/work-plans.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { WorkPlansStore } from './work-plans.store';
import { PROPOSAL_STATUS_CONFIG, PLAN_STATUS_CONFIG, ProposalStatus, PlanStatus } from './work-plans.model';

@Component({
  selector: 'app-work-plans',
  standalone: true,
  imports: [FormsModule, NgClass],
  providers: [WorkPlansStore],
  templateUrl: './work-plans.page.html',
  styleUrl: './work-plans.page.scss',
})
export class WorkPlansPage {
  readonly store = inject(WorkPlansStore);
  readonly router = inject(Router);
  
  readonly proposalStatusConfig = PROPOSAL_STATUS_CONFIG;
  readonly planStatusConfig = PLAN_STATUS_CONFIG;

  readonly pageSizeOptions = [10, 25, 50];

  readonly statusOptions = [
    { label: 'Selecione o status', value: '' },
    { label: 'Aguardando análise', value: 'ANALYSIS' },
    { label: 'Rascunho', value: 'DRAFT' },
    { label: 'Ativo', value: 'ACTIVE' },
  ];

  readonly instrumentOptions = [
    { label: 'Selecione o instrumento', value: '' },
    { label: 'Termo de Colaboração (TC)', value: 'TC' },
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

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: string): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // Type Guards para o HTML saber qual objeto renderizar na badge
  isProposal(item: any): item is { status: ProposalStatus } {
    return this.store.activeTab() === 'proposals';
  }

  isPlan(item: any): item is { status: PlanStatus } {
    return this.store.activeTab() === 'active-plans';
  }
}