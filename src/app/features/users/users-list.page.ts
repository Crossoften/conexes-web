// src/app/features/users/users-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsersStore } from './users.store';
import { UsersService } from './users.service';
import { User, PermissionProfile, USER_STATUS_CONFIG, UserUpdatePayload, PermissionProfileUpdatePayload } from './users.model';
import { UserDetailModalComponent } from './components/user-detail.modal';
import { PermissionDetailModalComponent } from './components/permission-detail.modal';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [NgClass, RouterLink, UserDetailModalComponent, PermissionDetailModalComponent],
  providers: [UsersStore],
  templateUrl: './users-list.page.html',
  styleUrl: './users-list.page.scss',
})
export class UsersListPage implements OnInit {
  readonly store        = inject(UsersStore);
  readonly svc          = inject(UsersService);
  private readonly notify = inject(NotificationService);
  readonly statusConfig = USER_STATUS_CONFIG;

  readonly selectedUser    = signal<User | null>(null);
  readonly selectedProfile = signal<PermissionProfile | null>(null);
  readonly userMode        = signal<'view' | 'edit'>('view');
  readonly profileMode     = signal<'view' | 'edit'>('view');

  readonly statusOptions = [
    { label: 'Todos os status', value: ''         },
    { label: 'Ativo',           value: 'Active'   },
    { label: 'Inativo',         value: 'Inactive' },
    { label: 'Pendente',        value: 'Pending'  },
  ];

  readonly roleOptions = [
  { label: 'Todos os perfis',     value: ''                    },
  { label: 'Master',              value: 'Master'              },
  { label: 'Admin',               value: 'Admin'               },
  { label: 'Backoffice',          value: 'Backoffice'          },
  { label: 'Gestor de Entidades', value: 'EntityManager'       },
  { label: 'Gestor de Compras',   value: 'ProcurementManager'  },
  { label: 'Financeiro',          value: 'Finance'             },
  { label: 'Operacional',         value: 'Operational'         },
];

  readonly pageSizeOptions = [10, 25, 50];

  readonly usersTotalPages = computed(() => this.store.usersTotalPages());
  readonly usersPageNumbers = computed((): (number | '...')[] =>
    this.buildPageNumbers(this.usersTotalPages(), this.store.usersPagination().page)
  );

  readonly profilesTotalPages = computed(() => this.store.profilesTotalPages());
  readonly profilesPageNumbers = computed((): (number | '...')[] =>
    this.buildPageNumbers(this.profilesTotalPages(), this.store.profilesPagination().page)
  );

  ngOnInit(): void {
    this.store.loadUsers();
  }

  // US-fix: a coluna "Módulos" conta módulos distintos, não linhas de permissão (uma por submenu).
  moduleCount(item: PermissionProfile): number {
    return new Set((item.permissions ?? []).map(p => p.module)).size;
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onUserSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setUserName(value), 400);
  }

  onProfileSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setProfileName(value), 400);
  }

  // ── Modal — User ──────────────────────────────────────────────────────────

  openUser(user: User, mode: 'view' | 'edit' = 'view'): void {
    this.userMode.set(mode);
    this.selectedUser.set(user);
    // O findAll pode vir enxuto (sem modulePermissions); busca o detalhe completo.
    this.svc.getUserById(user.id).subscribe({
      next: full => { if (this.selectedUser()?.id === user.id) this.selectedUser.set(full); },
      error: () => { /* mantém os dados da lista */ },
    });
  }
  closeUserModal(): void     { this.selectedUser.set(null); }

  onUserSaved(event: { id: number; payload: Partial<UserUpdatePayload> }): void {
    this.svc.updateUser(event.id, event.payload).subscribe({
      next: () => {
        this.closeUserModal();
        this.store.reload();
        this.showToast('Usuário atualizado com sucesso.', 'success');
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao atualizar usuário.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  onUserDeleted(id: number): void {
    if (!confirm('Deseja excluir este usuário?')) return;
    this.store.deleteUser(id).subscribe({
      next: () => {
        this.closeUserModal();
        this.showToast('Usuário excluído.', 'success');
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir usuário.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  // ── Modal — Profile ───────────────────────────────────────────────────────

  openProfile(p: PermissionProfile, mode: 'view' | 'edit' = 'view'): void {
    this.profileMode.set(mode);
    this.selectedProfile.set(p);
    // O findAll pode vir sem a matriz de permissões; busca o detalhe completo.
    this.svc.getProfileById(p.id).subscribe({
      next: full => { if (this.selectedProfile()?.id === p.id) this.selectedProfile.set(full); },
      error: () => { /* mantém os dados da lista */ },
    });
  }
  closeProfileModal(): void               { this.selectedProfile.set(null); }

  onProfileSaved(event: { id: number; payload: Partial<PermissionProfileUpdatePayload> }): void {
    this.svc.updateProfile(event.id, event.payload).subscribe({
      next: () => {
        this.closeProfileModal();
        this.store.reload();
        this.showToast('Perfil atualizado com sucesso.', 'success');
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao atualizar perfil.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  onProfileDeleted(id: number): void {
    if (!confirm('Deseja excluir este perfil de permissão?')) return;
    this.store.deleteProfile(id).subscribe({
      next: () => {
        this.closeProfileModal();
        this.showToast('Perfil excluído.', 'success');
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao excluir perfil.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  // ── Feedback via toast global (NotificationService + <app-toast> na raiz) ────

  private showToast(msg: string, type: 'success' | 'error'): void {
    if (type === 'success') this.notify.success(msg);
    else this.notify.error(msg);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  goToUsersPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setUsersPage(p);
  }

  goToProfilesPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setProfilesPage(p);
  }

  private buildPageNumbers(total: number, current: number): (number | '...')[] {
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
  }
}