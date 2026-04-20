import { Component, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StakeholdersStore } from './stakeholders.store';
import { StakeholderDetailModalComponent } from './components/stakeholder-detail.modal';

@Component({
  selector: 'app-stakeholders-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, StakeholderDetailModalComponent],
  providers: [StakeholdersStore],
  templateUrl: './stakeholders-list.page.html',
  styleUrl: './stakeholders-list.page.scss',
})
export class StakeholdersPage { // ou StakeholdersListPage
  readonly store = inject(StakeholdersStore);

  readonly statusOptions = [
    { label: 'Selecione o status', value: '' },
    { label: 'Ativo', value: 'ACTIVE' },
    { label: 'Inativo', value: 'INACTIVE' },
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

  getSortState(col: string): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── CONTROLE DO MODAL DE DETALHES ──
  selectedStakeholder: any = null;
  isModalOpen = false;

  openModal(stakeholder: any) {
    this.selectedStakeholder = stakeholder;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedStakeholder = null;
  }
}