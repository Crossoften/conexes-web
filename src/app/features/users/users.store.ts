// src/app/features/users/users.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { User, PermissionProfile } from './users.model';
import { UsersService } from './users.service';

export type TabType = 'users' | 'permissions';

interface State {
  // ── Users
  users:           User[];
  usersLoading:    boolean;
  usersError:      string | null;
  usersPagination: { page: number; pageSize: number; total: number };
  usersFilters:    { name: string; role: string; status: string };

  // ── Permission Profiles
  profiles:        PermissionProfile[];
  profilesLoading: boolean;
  profilesError:   string | null;
  profilesPagination: { page: number; pageSize: number; total: number };
  profilesFilters: { name: string };

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

    profiles:           [],
    profilesLoading:    false,
    profilesError:      null,
    profilesPagination: { page: 1, pageSize: 10, total: 0 },
    profilesFilters:    { name: '' },

    activeTab:   'users',
    selectedIds: new Set(),
  });

  // ── Selectors — Users ─────────────────────────────────────────────────────

  readonly users           = computed(() => this.state().users);
  readonly usersLoading    = computed(() => this.state().usersLoading);
  readonly usersError      = computed(() => this.state().usersError);
  readonly usersPagination = computed(() => this.state().usersPagination);
  readonly usersFilters    = computed(() => this.state().usersFilters);

  readonly pageItems = computed(() => {
    const f = this.state().usersFilters;
    let items = this.state().users;
    if (f.status) items = items.filter(u => u.status === f.status);
    return items;
  });

  readonly usersTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.state().usersPagination.total / this.state().usersPagination.pageSize))
  );

  // ── Selectors — Profiles ──────────────────────────────────────────────────

  readonly profiles           = computed(() => this.state().profiles);
  readonly profilesLoading    = computed(() => this.state().profilesLoading);
  readonly profilesError      = computed(() => this.state().profilesError);
  readonly profilesPagination = computed(() => this.state().profilesPagination);
  readonly profilesFilters    = computed(() => this.state().profilesFilters);

  readonly profilesTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.state().profilesPagination.total / this.state().profilesPagination.pageSize))
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
        users:           res.data  ?? (res as any),
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
      next: () => this.state.update(s => ({
        ...s,
        users:       s.users.filter(u => u.id !== id),
        selectedIds: new Set([...s.selectedIds].filter(x => x !== id)),
      })),
      error: err => this.state.update(s => ({
        ...s,
        usersError: err?.error?.message ?? 'Erro ao excluir usuário.',
      })),
    });
  }

  // ── Actions — Profiles ────────────────────────────────────────────────────

  loadProfiles(): void {
    const { page, pageSize } = this.state().profilesPagination;
    const { name }           = this.state().profilesFilters;
    const skip = (page - 1) * pageSize;

    this.state.update(s => ({ ...s, profilesLoading: true, profilesError: null }));

    this.svc.getProfiles({ skip, take: pageSize, name: name || undefined }).subscribe({
      next: res => this.state.update(s => ({
        ...s,
        profiles:           res.data ?? (res as any),
        profilesLoading:    false,
        profilesPagination: { ...s.profilesPagination, total: res.total ?? (res as any)?.length ?? 0 },
      })),
      error: err => this.state.update(s => ({
        ...s,
        profilesLoading: false,
        profilesError:   err?.error?.message ?? 'Erro ao carregar perfis de permissão.',
      })),
    });
  }

  deleteProfile(id: number): void {
    this.svc.deleteProfile(id).subscribe({
      next: () => this.state.update(s => ({
        ...s,
        profiles:    s.profiles.filter(p => p.id !== id),
        selectedIds: new Set([...s.selectedIds].filter(x => x !== id)),
      })),
      error: err => this.state.update(s => ({
        ...s,
        profilesError: err?.error?.message ?? 'Erro ao excluir perfil.',
      })),
    });
  }

  // ── Actions — Tab ─────────────────────────────────────────────────────────

  setTab(tab: TabType): void {
    this.state.update(s => ({ ...s, activeTab: tab, selectedIds: new Set() }));
    if (tab === 'users')       this.loadUsers();
    if (tab === 'permissions') this.loadProfiles();
  }

  // ── Actions — Users filters ───────────────────────────────────────────────

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
    this.state.update(s => ({ ...s, usersFilters: { ...s.usersFilters, status } }));
  }

  // ── Actions — Profiles filters ────────────────────────────────────────────

  setProfileName(name: string): void {
    this.state.update(s => ({
      ...s,
      profilesFilters:    { name },
      profilesPagination: { ...s.profilesPagination, page: 1 },
    }));
    this.loadProfiles();
  }

  // ── Actions — Pagination users ────────────────────────────────────────────

  setUsersPage(page: number): void {
    this.state.update(s => ({ ...s, usersPagination: { ...s.usersPagination, page } }));
    this.loadUsers();
  }

  setUsersPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, usersPagination: { ...s.usersPagination, pageSize, page: 1 } }));
    this.loadUsers();
  }

  // ── Actions — Pagination profiles ─────────────────────────────────────────

  setProfilesPage(page: number): void {
    this.state.update(s => ({ ...s, profilesPagination: { ...s.profilesPagination, page } }));
    this.loadProfiles();
  }

  setProfilesPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, profilesPagination: { ...s.profilesPagination, pageSize, page: 1 } }));
    this.loadProfiles();
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

  reload(): void {
    if (this.state().activeTab === 'users') this.loadUsers();
    else                                    this.loadProfiles();
  }
}