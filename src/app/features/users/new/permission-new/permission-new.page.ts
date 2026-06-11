// src/app/features/users/new/permission-new/permission-new.page.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { UsersService } from '../../users.service';
import { ModulePermission, Permission, DEFAULT_MODULES } from '../../users.model';

@Component({
  selector: 'app-permission-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './permission-new.page.html',
  styleUrl: './permission-new.page.scss',
})
export class PermissionNewPage implements OnInit {
  private router = inject(Router);
  private svc    = inject(UsersService);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly permissions  = signal<Permission[]>([]);
  readonly permsLoading = signal(false);

  // Permission selecionada para pré-preencher a tabela
  readonly selectedPermissionId = signal<number | null>(null);

  // Módulos editáveis da tabela
  modules: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  // Label da permission selecionada para exibição
  readonly selectedPermissionLabel = computed(() => {
    const id = this.selectedPermissionId();
    if (!id) return '';
    const p = this.permissions().find(x => x.id === id);
    return p ? `${p.module} — ${p.subMenu}` : '';
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (!this.svc.draftUserData()) {
      this.router.navigate(['/users/new-user']);
      return;
    }
    this.loadPermissions();
  }

  private loadPermissions(): void {
    this.permsLoading.set(true);
    this.svc.getPermissions({ take: 100 }).subscribe({
      next: res => {
        this.permissions.set(res.data ?? (res as any));
        this.permsLoading.set(false);
      },
      error: () => this.permsLoading.set(false),
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  onSelectPermission(event: Event): void {
    const id = +(event.target as HTMLSelectElement).value;
    this.selectedPermissionId.set(id || null);

    if (!id) {
      this.modules = DEFAULT_MODULES.map(m => ({ ...m }));
      return;
    }

    // Busca detalhes e pré-preenche a tabela com os flags da permission
    this.svc.getPermissionById(id).subscribe({
      next: p => {
        // Aplica os flags da permission selecionada a todos os módulos
        this.modules = DEFAULT_MODULES.map(m => ({
          ...m,
          canView:     p.canView,
          canCreate:   p.canCreate,
          canEdit:     p.canEdit,
          canDelete:   p.canDelete,
          isUnlimited: p.isUnlimited,
        }));
      },
    });
  }

  togglePermission(index: number, field: keyof Pick<ModulePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited'>): void {
    this.modules[index] = { ...this.modules[index], [field]: !this.modules[index][field] };
  }

  resetForm(): void {
    this.selectedPermissionId.set(null);
    this.modules  = DEFAULT_MODULES.map(m => ({ ...m }));
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    const draft = this.svc.draftUserData();
    if (!draft) {
      this.router.navigate(['/users/new-user']);
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const payload = {
      ...draft,
      modulePermissions: this.modules,
    } as any;

    this.svc.createUser(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.svc.clearDraft();
        this.router.navigate(['/users']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar usuário. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}