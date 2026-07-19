// src/app/features/stakeholders/stakeholders-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StakeholdersStore } from './stakeholders.store';
import { StakeholdersService } from './stakeholders.service';
import { StakeholderDetailModalComponent } from './components/stakeholder-detail.modal';
import {
  Stakeholder,
  StakeholderListItem,
  StakeholderPayload,
  StakeholderStatus,
  StakeholderType,
  StakeholderView,
  PersonType,
  VIEW_TYPES,
  STAKEHOLDER_TYPE_LABELS,
} from './stakeholders.model';

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

  // ── Opções dos filtros ────────────────────────────────────────────────────

  readonly statusOptions = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Inativo',            value: 'Inactive' },
    { label: 'Pendente',           value: 'Pending'  },
  ];

  readonly personTypeOptions = [
    { label: 'Selecione o tipo', value: ''      },
    { label: 'Pessoa Física',    value: 'PF'    },
    { label: 'Pessoa Jurídica',  value: 'PJ'    },
    { label: 'Outro',            value: 'Other' },
  ];

  // FE-S2: visões (Fornecedores/Clientes) e filtro de tipo dependente da visão.
  readonly viewOptions = [
    { label: 'Fornecedores', value: 'suppliers' },
    { label: 'Clientes',     value: 'clients'   },
  ];

  readonly typeOptions = computed(() => {
    const view = this.store.filters().view;
    return [
      { label: 'Todos os tipos', value: '' },
      ...VIEW_TYPES[view].map(t => ({ label: STAKEHOLDER_TYPE_LABELS[t], value: t })),
    ];
  });

  readonly pageSizeOptions = [10, 25, 50, 100, 200, 500];

  // ── Paginação ─────────────────────────────────────────────────────────────

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

  // ── Filtros ───────────────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  onStatusChange(value: string): void {
    this.store.setStatus(value as StakeholderStatus | '');
  }

  onPersonTypeChange(value: string): void {
    this.store.setPersonType(value as PersonType | '');
  }

  onViewChange(value: string): void {
    this.store.setView(value as StakeholderView);
  }

  onTypeChange(value: string): void {
    this.store.setType(value as StakeholderType | '');
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportExcel(): void {
    this.store.exportExcel();
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

  // ── Modal ─────────────────────────────────────────────────────────────────

  selectedStakeholder: Stakeholder | null = null;
  isModalOpen  = false;
  modalLoading = false;
  saveLoading  = false;
  saveError:   string | null = null;

  // ── Toast de feedback ─────────────────────────────────────────────────────

  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 4000);
  }

  openModal(item: StakeholderListItem): void {
    this.modalLoading = true;
    this.saveError    = null;
    this.svc.getById(item.id).subscribe({
      next: stakeholder => {
        this.selectedStakeholder = stakeholder;
        this.isModalOpen  = true;
        this.modalLoading = false;
      },
      error: () => { this.modalLoading = false; },
    });
  }

  closeModal(): void {
    this.isModalOpen         = false;
    this.selectedStakeholder = null;
    this.saveError           = null;
  }

  // ── Salvar edição (PATCH) ─────────────────────────────────────────────────
  // O modal emite { id, payload } via @Output() saved.
  // Após salvar com sucesso, rebusca o detalhe para atualizar o modal
  // e recarrega a listagem para refletir eventuais mudanças de nome/status.

  onSaved(event: { id: number; payload: Partial<StakeholderPayload> }): void {
    this.saveLoading = true;
    this.saveError   = null;

    this.svc.update(event.id, event.payload).subscribe({
      next: () => {
        this.saveLoading = false;
        this.closeModal();
        this.store.load();
        this.showToast('Stakeholder salvo com sucesso!', 'success');
      },
      error: err => {
        this.saveLoading = false;
        const raw = err?.error?.message;
        const msg = Array.isArray(raw)
          ? raw.join(' | ')
          : (raw ?? 'Erro ao salvar alterações.');
        this.showToast(msg, 'error');
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  onDelete(id: number): void {
    if (!confirm('Tem certeza que deseja excluir este stakeholder?')) return;
    this.store.deleteById(id);
    this.closeModal();
  }
}