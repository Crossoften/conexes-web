// src/app/features/quotations/quotations-list.page.ts
import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { QuotationsStore } from './quotations.store';
import { Quotation, RequisitionStatus, REQ_STATUS_CONFIG, ORDER_STATUS_CONFIG } from './quotations.model';

@Component({
  selector: 'app-quotations-list',
  standalone: true,
  imports: [FormsModule, NgClass],
  providers: [QuotationsStore],
  templateUrl: './quotations-list.page.html',
  styleUrl: './quotations-list.page.scss',
})
export class QuotationsListPage {
  readonly store      = inject(QuotationsStore);
  readonly route      = inject(ActivatedRoute);
  readonly reqConfig  = REQ_STATUS_CONFIG;
  readonly ordConfig  = ORDER_STATUS_CONFIG;

  // Título da seção vem do data da rota
  readonly sectionTitle = computed(() =>
    this.route.snapshot.data['title'] ?? 'Requisições'
  );

  readonly statusOptions: { label: string; value: RequisitionStatus | '' }[] = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Rascunho',           value: 'DRAFT'    },
    { label: 'Ativo',              value: 'ACTIVE'   },
    { label: 'Aprovado',           value: 'APPROVED' },
    { label: 'Rejeitado',          value: 'REJECTED' },
    { label: 'Pendente',           value: 'PENDING'  },
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

  getSortState(col: keyof Quotation): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Quotation) { return item.id; }
}
