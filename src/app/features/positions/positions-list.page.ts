// src/app/features/positions/positions-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PositionsStore } from './positions.store';
import { Position } from './positions.model';

@Component({
  selector: 'app-positions-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink],
  providers: [PositionsStore],
  templateUrl: './positions-list.page.html',
  styleUrl: './positions-list.page.scss',
})
export class PositionsListPage implements OnInit {
  readonly store = inject(PositionsStore);

  readonly typeOptions = [
    { label: 'Selecione o tipo',  value: ''               },
    { label: 'Corpo Diretivo',    value: 'Corpo Diretivo'  },
    { label: 'Conselho Fiscal',   value: 'Conselho Fiscal' },
    { label: 'Responsável',       value: 'Responsável'     },
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

  getSortState(col: keyof Position): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Position): number { return item.id; }
}
