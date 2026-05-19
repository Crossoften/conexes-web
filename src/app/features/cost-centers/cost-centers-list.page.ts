// src/app/features/cost-centers/cost-centers-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CostCentersStore } from './cost-centers.store';
import { CostCenter, CostCenterStatus, CostCenterType, COST_CENTER_STATUS_CONFIG } from './cost-centers.model';

@Component({
  selector: 'app-cost-centers-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [CostCentersStore],
  templateUrl: './cost-centers-list.page.html',
  styleUrl: './cost-centers-list.page.scss',
})
export class CostCentersListPage implements OnInit {
  readonly store        = inject(CostCentersStore);
  readonly statusConfig = COST_CENTER_STATUS_CONFIG;

  readonly statusOptions: { label: string; value: CostCenterStatus | '' }[] = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Inativo',            value: 'Inactive' },
  ];

  readonly typeOptions: { label: string; value: CostCenterType | '' }[] = [
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

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.store.load();
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  onDelete(id: number): void {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    this.store.deleteById(id);
  }

  getSortState(col: keyof CostCenter): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  toStr(id: number): string { return String(id); }

  trackById(_: number, item: CostCenter): number { return item.id; }
}
