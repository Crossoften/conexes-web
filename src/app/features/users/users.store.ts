// src/app/features/users/users.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { User, Permission, USER_STATUS_CONFIG } from './users.model';
import { UsersService } from './users.service';

export type TabType = 'users' | 'permissions';

interface UsersPagination  { page: number; pageSize: number; total: number }
interface PermsPagination  { page: number; pageSize: number; total: number }

interface State {
  // ── Users
  users:           User[];
  usersLoading:    boolean;
  usersError:      string | null;
  usersPagination: UsersPagination;
  usersFilters:    { name: string; role: string; status: string };

  // ── Permissions
  permissions:     Permission[];
  permsLoading:    boolean;
  permsError:      string | null;
  permsPagination: PermsPagination;
  permsFilters:    { module: string; userId: string };

  // ── Shared
  activeTab:   TabType;
  selectedIds: Set<number>;
}

@Injectable()
export class UsersStore {
  private svc = inject(UsersService);

  private readonly state = signal<State>({
    users:           [],
    usersLoading:    false,
    usersError:      null,
    usersPagination: { page: 1, pageSize: 10, total: 0 },
    usersFilters:    { name: '', role: '', status: '' },

    permissions:     [],
    permsLoading:    false,
    permsError:      null,
    permsPagination: { page: 1, pageSize: 10, total: 0 },
    permsFilters:    { module: '', userId: '' },

    activeTab:   'users',
    selectedIds: new Set(),
  });

  // ── Selectors — Users ─────────────────────────────────────────────────────

  readonly users           = computed(() => this.state().users);
  readonly usersLoading    = computed(() => this.state().usersLoading);
  readonly usersError      = computed(() => this.state().usersError);
  readonly usersPagination = computed(() => this.state().usersPagination);
  readonly usersFilters    = computed(() => this.state().usersFilters);

  // Client-side status filter (status não é param do GET /v1/users)
  readonly pageItems = computed(() => {
    let items = this.state().users;
    const f   = this.state().usersFilters;
    if (f.status) items = items.filter(u => u.status === f.status);
    return items;
  });

  readonly usersTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.state().usersPagination.total / this.state().usersPagination.pageSize))
  );

  // ── Selectors — Permissions ───────────────────────────────────────────────

  readonly permissions     = computed(() => this.state().permissions);
  readonly permsLoading    = computed(() => this.state().permsLoading);
  readonly permsError      = computed(() => this.state().permsError);
  readonly permsPagination = computed(() => this.state().permsPagination);
  readonly permsFilters    = computed(() => this.state().permsFilters);

  readonly permsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.state().permsPagination.total / this.state().permsPagination.pageSize))
  );

  // ── Selectors — Shared ────────────────────────────────────────────────────

  readonly activeTab   = computed(() => this.state().activeTab);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(i => this.selectedIds().has(i.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(i => this.selectedIds().has(i.id)) && !this.allPageSelected();
  });

  // ── Actions — Users ───────────────────────────────────────────────────────

  loadUsers(): void {
    const { page, pageSize } = this.state().usersPagination;
    const { name, role }     = this.state().usersFilters;
    const skip = (page - 1) * pageSize;

    this.state.update(s => ({ ...s, usersLoading: true, usersError: null }));

    this.svc.getUsers({ skip, take: pageSize, name: name || undefined, role: role || undefined }).subscribe({
      next: res => this.state.update(s => ({
        ...s,
        users:           res.data ?? (res as any),
        usersLoading:    false,
        usersPagination: { ...s.usersPagination, total: res.total ?? (res as any)?.length ?? 0 },
      })),
      error: err => this.state.update(s => ({
        ...s,
        usersLoading: false,
        usersError:   err?.error?.message ?? 'Erro ao carregar usuários.',
      })),
    });
  }

  deleteUser(id: number): void {
    this.svc.deleteUser(id).subscribe({
      next: () => {
        this.state.update(s => ({
          ...s,
          users:       s.users.filter(u => u.id !== id),
          selectedIds: new Set([...s.selectedIds].filter(x => x !== id)),
        }));
      },
      error: err => this.state.update(s => ({
        ...s,
        usersError: err?.error?.message ?? 'Erro ao excluir usuário.',
      })),
    });
  }

  // ── Actions — Permissions ─────────────────────────────────────────────────

  loadPermissions(): void {
    const { page, pageSize } = this.state().permsPagination;
    const { module, userId } = this.state().permsFilters;
    const skip = (page - 1) * pageSize;

    this.state.update(s => ({ ...s, permsLoading: true, permsError: null }));

    this.svc.getPermissions({
      skip,
      take:   pageSize,
      module: module || undefined,
      userId: userId ? +userId : undefined,
    }).subscribe({
      next: res => this.state.update(s => ({
        ...s,
        permissions:     res.data ?? (res as any),
        permsLoading:    false,
        permsPagination: { ...s.permsPagination, total: res.total ?? (res as any)?.length ?? 0 },
      })),
      error: err => this.state.update(s => ({
        ...s,
        permsLoading: false,
        permsError:   err?.error?.message ?? 'Erro ao carregar permissões.',
      })),
    });
  }

  deletePermission(id: number): void {
    this.svc.deletePermission(id).subscribe({
      next: () => {
        this.state.update(s => ({
          ...s,
          permissions: s.permissions.filter(p => p.id !== id),
          selectedIds: new Set([...s.selectedIds].filter(x => x !== id)),
        }));
      },
      error: err => this.state.update(s => ({
        ...s,
        permsError: err?.error?.message ?? 'Erro ao excluir permissão.',
      })),
    });
  }

  // ── Actions — Tab / Filters ───────────────────────────────────────────────

  setTab(tab: TabType): void {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set() }));
    if (tab === 'users')       this.loadUsers();
    if (tab === 'permissions') this.loadPermissions();
  }

  // Users filters
  setUserName(name: string): void {
    this.state.update(s => ({
      ...s,
      usersFilters:    { ...s.usersFilters, name },
      usersPagination: { ...s.usersPagination, page: 1 },
    }));
    this.loadUsers();
  }

  setUserRole(role: string): void {
    this.state.update(s => ({
      ...s,
      usersFilters:    { ...s.usersFilters, role },
      usersPagination: { ...s.usersPagination, page: 1 },
    }));
    this.loadUsers();
  }

  setUserStatus(status: string): void {
    this.state.update(s => ({
      ...s,
      usersFilters: { ...s.usersFilters, status },
    }));
  }

  // Permissions filters
  setPermModule(module: string): void {
    this.state.update(s => ({
      ...s,
      permsFilters:    { ...s.permsFilters, module },
      permsPagination: { ...s.permsPagination, page: 1 },
    }));
    this.loadPermissions();
  }

  setPermUserId(userId: string): void {
    this.state.update(s => ({
      ...s,
      permsFilters:    { ...s.permsFilters, userId },
      permsPagination: { ...s.permsPagination, page: 1 },
    }));
    this.loadPermissions();
  }

  // ── Actions — Pagination ──────────────────────────────────────────────────

  setUsersPage(page: number): void {
    this.state.update(s => ({ ...s, usersPagination: { ...s.usersPagination, page } }));
    this.loadUsers();
  }

  setUsersPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, usersPagination: { ...s.usersPagination, pageSize, page: 1 } }));
    this.loadUsers();
  }

  setPermsPage(page: number): void {
    this.state.update(s => ({ ...s, permsPagination: { ...s.permsPagination, page } }));
    this.loadPermissions();
  }

  setPermsPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, permsPagination: { ...s.permsPagination, pageSize, page: 1 } }));
    this.loadPermissions();
  }

  // ── Actions — Selection ───────────────────────────────────────────────────

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: User[]): void {
    this.state.update(s => {
      const newSet      = new Set(s.selectedIds);
      const allSelected = items.every(i => newSet.has(i.id));
      items.forEach(i => allSelected ? newSet.delete(i.id) : newSet.add(i.id));
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Recarrega a aba ativa — útil após salvar no modal */
  reload(): void {
    if (this.state().activeTab === 'users') this.loadUsers();
    else                                    this.loadPermissions();
  }
}