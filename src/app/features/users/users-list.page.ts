// src/app/features/users/users-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsersStore } from './users.store';
import { UsersService } from './users.service';
import { User, Permission, USER_STATUS_CONFIG, UserUpdatePayload, PermissionUpdatePayload } from './users.model';
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

  // ── Modal state ───────────────────────────────────────────────────────────

  readonly selectedUser       = signal<User | null>(null);
  readonly selectedPermission = signal<Permission | null>(null);
  readonly toast              = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── Filter options ────────────────────────────────────────────────────────

  readonly statusOptions = [
    { label: 'Todos os status', value: ''         },
    { label: 'Ativo',           value: 'Active'   },
    { label: 'Inativo',         value: 'Inactive' },
  ];

  readonly roleOptions = [
    { label: 'Todos os perfis', value: ''         },
    { label: 'Master',          value: 'Master'   },
    { label: 'Admin',           value: 'Admin'    },
    { label: 'Gerente',         value: 'Manager'  },
    { label: 'Operador',        value: 'Operator' },
    { label: 'Viewer',          value: 'Viewer'   },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  // ── Pagination helpers ────────────────────────────────────────────────────

  readonly usersTotalPages = computed(() => this.store.usersTotalPages());

  readonly usersPageNumbers = computed((): (number | '...')[] => {
    const total   = this.usersTotalPages();
    const current = this.store.usersPagination().page;
    return this.buildPageNumbers(total, current);
  });

  readonly permsTotalPages = computed(() => this.store.permsTotalPages());

  readonly permsPageNumbers = computed((): (number | '...')[] => {
    const total   = this.permsTotalPages();
    const current = this.store.permsPagination().page;
    return this.buildPageNumbers(total, current);
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.store.loadUsers();
  }

  // ── Search debounce ───────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onUserSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setUserName(value), 400);
  }

  onPermSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setPermModule(value), 400);
  }

  // ── Modal — User ──────────────────────────────────────────────────────────

  openUser(user: User): void {
    this.selectedUser.set(user);
  }

  closeUserModal(): void {
    this.selectedUser.set(null);
  }

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

  // ── Modal — Permission ────────────────────────────────────────────────────

  openPermission(p: Permission): void {
    this.selectedPermission.set(p);
  }

  closePermModal(): void {
    this.selectedPermission.set(null);
  }

  onPermSaved(event: { id: number; payload: Partial<PermissionUpdatePayload> }): void {
    this.svc.updatePermission(event.id, event.payload).subscribe({
      next: () => {
        this.closePermModal();
        this.store.reload();
        this.showToast('Permissão atualizada com sucesso.', 'success');
      },
      error: err => {
        const msg = err?.error?.message ?? 'Erro ao atualizar permissão.';
        this.showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
      },
    });
  }

  onPermDeleted(id: number): void {
    if (!confirm('Deseja excluir esta permissão?')) return;
    this.store.deletePermission(id);
    this.closePermModal();
    this.showToast('Permissão excluída.', 'success');
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

  goToPermsPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPermsPage(p);
  }

  getSortState(_col: keyof User): 'none' | 'asc' | 'desc' {
    return 'none';
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