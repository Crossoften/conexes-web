// src/app/features/work-plans/work-plans.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WorkPlansStore } from './work-plans.store';
import { WORK_PLAN_STATUS_CONFIG, WorkPlanStatus } from './work-plans.model';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/services/notification.service';

/** Papéis globais autorizados a aprovar/alterar status (proposta → plano ativo). */
const STATUS_ROLES = ['Master', 'Admin'];

interface StatusAction { label: string; target: WorkPlanStatus; danger?: boolean; }

@Component({
  selector: 'app-work-plans',
  standalone: true,
  imports: [NgClass, RouterLink],
  providers: [WorkPlansStore],
  templateUrl: './work-plans.page.html',
  styleUrl: './work-plans.page.scss',
})
export class WorkPlansPage implements OnInit {
  readonly store  = inject(WorkPlansStore);
  private  router = inject(Router);
  private  auth   = inject(AuthService);
  private  notify = inject(NotificationService);

  readonly statusConfig = WORK_PLAN_STATUS_CONFIG;

  // ── Menu de ações (⋯) ─────────────────────────────────────────────────────
  readonly openMenuId = signal<number | null>(null);
  readonly menuPos    = signal<{ top: number; right: number } | null>(null);

  /** Só Admin/Master alteram status (o back também gateia com 403). */
  readonly canChangeStatus = computed(() => STATUS_ROLES.includes(this.auth.user()?.role ?? ''));

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

  /** Transições de status disponíveis conforme o status atual. */
  statusActions(status: WorkPlanStatus | ''): StatusAction[] {
    const acts: StatusAction[] = [];
    if (status === 'Draft')            acts.push({ label: 'Enviar para aprovação', target: 'AwaitingApproval' });
    if (status === 'AwaitingApproval') { acts.push({ label: 'Aprovar / Ativar', target: 'Active' }); acts.push({ label: 'Recusar', target: 'Draft' }); }
    if (status === 'Active')           acts.push({ label: 'Concluir', target: 'Completed' });
    if (status && status !== 'Completed' && status !== 'Cancelled') acts.push({ label: 'Cancelar', target: 'Cancelled', danger: true });
    return acts;
  }

  onView(id: number): void {
    this.closeMenu();
    this.router.navigate(['/work-plans', id, 'view']);
  }

  onEdit(id: number): void {
    this.closeMenu();
    this.router.navigate(['/work-plans', id, 'edit']);
  }

  onChangeStatus(id: number, target: WorkPlanStatus): void {
    this.closeMenu();
    if (!this.canChangeStatus()) {
      this.notify.error('Alteração de status restrita: exige autorização de um superior (Admin/Master).');
      return;
    }
    if (target === 'Cancelled' && !window.confirm('Cancelar este plano de trabalho?')) return;
    this.store.changeStatus(id, target);
  }

  onDelete(id: number): void {
    this.closeMenu();
    if (!window.confirm('Excluir este plano de trabalho? Esta ação não pode ser desfeita.')) return;
    this.store.delete(id);
  }

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
