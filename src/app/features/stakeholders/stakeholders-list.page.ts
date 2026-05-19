// src/app/features/stakeholders/stakeholders-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StakeholdersStore } from './stakeholders.store';
import { StakeholdersService } from './stakeholders.service';
import { StakeholderDetailModalComponent } from './components/stakeholder-detail.modal';
import { Stakeholder, StakeholderListItem, StakeholderStatus } from './stakeholders.model';

@Component({
  selector: 'app-stakeholders-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, StakeholderDetailModalComponent],
  providers: [StakeholdersStore],
  templateUrl: './stakeholders-list.page.html',
  styleUrl: './stakeholders-list.page.scss',
})
export class StakeholdersPage implements OnInit {
  readonly store = inject(StakeholdersStore);
  private  svc   = inject(StakeholdersService);

  readonly statusOptions = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Inativo',            value: 'Inactive' },
    { label: 'Pendente',           value: 'Pending'  },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total   = this.store.totalPages();
    const current = this.store.pagination().page;
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.store.load();
  }

  // ── Search com debounce ───────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  onStatusChange(value: string): void {
    this.store.setStatus(value as StakeholderStatus | '');
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  getSortState(col: string): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── Modal de detalhes ─────────────────────────────────────────────────────
  // O modal precisa do Stakeholder completo, mas a listagem retorna StakeholderListItem.
  // Por isso buscamos o detalhe via service antes de abrir.

  selectedStakeholder: Stakeholder | null = null;
  isModalOpen  = false;
  modalLoading = false;

  openModal(item: StakeholderListItem): void {
    this.modalLoading = true;
    this.svc.getById(item.id).subscribe({
      next: stakeholder => {
        this.selectedStakeholder = stakeholder;
        this.isModalOpen  = true;
        this.modalLoading = false;
      },
      error: () => {
        this.modalLoading = false;
      },
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedStakeholder = null;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  onDelete(id: number): void {
    if (!confirm('Tem certeza que deseja excluir este stakeholder?')) return;
    this.store.deleteById(id);
    this.closeModal();
  }
}
