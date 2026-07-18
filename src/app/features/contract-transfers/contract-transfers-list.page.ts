// src/app/features/contract-transfers/contract-transfers-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ContractTransfersStore } from './contract-transfers.store';
import { PartnershipRow, PartnershipStatus } from './contract-transfers.model';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/services/notification.service';

/** Papéis globais autorizados a excluir/inativar contrato (regra do doc:
 *  exclusão é restrita e exige autorização de um superior). */
const DELETE_ROLES = ['Master', 'Admin'];

@Component({
  selector: 'app-contract-transfers-list',
  standalone: true,
  imports: [NgClass, RouterLink],
  providers: [ContractTransfersStore],
  templateUrl: './contract-transfers-list.page.html',
  styleUrl: './contract-transfers-list.page.scss',
})
export class ContractTransfersListPage implements OnInit {
  readonly store  = inject(ContractTransfersStore);
  private  router = inject(Router);
  private  auth   = inject(AuthService);
  private  notify = inject(NotificationService);

  /** Menu de opções (⋯) aberto para qual linha. */
  readonly openMenuId = signal<number | null>(null);
  /** Posição (fixed) do dropdown — evita corte pelo overflow da tabela. */
  readonly menuPos = signal<{ top: number; right: number } | null>(null);

  /** Só Admin/Master podem excluir (o back também gateia com 403). */
  readonly canDelete = computed(() => DELETE_ROLES.includes(this.auth.user()?.role ?? ''));

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    if (this.openMenuId() === id) { this.closeMenu(); return; }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuPos.set({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    this.openMenuId.set(id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.menuPos.set(null);
  }

  /** Anexos: abre o contrato na aba de anexos (gerenciar arquivos). */
  onAnexos(id: number): void {
    this.closeMenu();
    this.router.navigate(['/contract-transfers', id, 'edit'], { queryParams: { tab: 'anexos' } });
  }

  onDelete(id: number): void {
    this.closeMenu();
    if (!this.canDelete()) {
      this.notify.error('Exclusão restrita: exige autorização de um superior (Admin/Master).');
      return;
    }
    if (!window.confirm('Excluir este contrato de parceria? Esta ação é restrita e não pode ser desfeita.')) return;
    this.store.delete(id);
  }

  /** Ações P2 ainda sem endpoint no back (instrumentos / financeiro / recebimentos). */
  onComingSoon(label: string): void {
    this.closeMenu();
    this.notify.error(`"${label}" ainda não está disponível — em desenvolvimento no back-end.`);
  }

  readonly statusOptions: { label: string; value: PartnershipStatus | '' }[] = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Pendente',           value: 'Pending'  },
    { label: 'Inativo',            value: 'Inactive' },
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

  ngOnInit(): void {
    this.store.load();
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof PartnershipRow): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }
}
