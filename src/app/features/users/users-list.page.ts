// src/app/features/users/users-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsersStore } from './users.store';
import { UsersService } from './users.service';
import { User, PermissionProfile, USER_STATUS_CONFIG, UserUpdatePayload, PermissionProfileUpdatePayload } from './users.model';
import { UserDetailModalComponent } from './components/user-detail.modal';
import { PermissionDetailModalComponent } from './components/permission-detail.modal';

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
  readonly statusConfig = USER_STATUS_CONFIG;

  readonly selectedUser    = signal<User | null>(null);
  readonly selectedProfile = signal<PermissionProfile | null>(null);
  readonly toast           = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  openUser(user: User): void { this.selectedUser.set(user); }
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
    this.store.deleteUser(id);
    this.closeUserModal();
    this.showToast('Usuário excluído.', 'success');
  }

  // ── Modal — Profile ───────────────────────────────────────────────────────

  openProfile(p: PermissionProfile): void { this.selectedProfile.set(p); }
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
    this.store.deleteProfile(id);
    this.closeProfileModal();
    this.showToast('Perfil excluído.', 'success');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
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