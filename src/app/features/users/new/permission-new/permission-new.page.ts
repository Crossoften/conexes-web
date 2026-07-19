// src/app/features/users/new/permission-new/permission-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { UsersService } from '../../users.service';
import { ModulePermission, DEFAULT_MODULES } from '../../users.model';

@Component({
  selector: 'app-permission-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './permission-new.page.html',
  styleUrl: './permission-new.page.scss',
})
export class PermissionNewPage {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(UsersService);

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  /** US-7: base da matriz vinda do catálogo oficial (fallback = DEFAULT_MODULES). */
  private catalogBase: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));
  modules: ModulePermission[] = this.catalogBase.map(m => ({ ...m }));

  constructor() {
    this.svc.getModulesCatalog().subscribe({
      next: c => { if (c.length) { this.catalogBase = c; this.modules = c.map(m => ({ ...m })); } },
      error: () => {},
    });
  }

  form: FormGroup = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
  });

  // ── Módulos ───────────────────────────────────────────────────────────────

  togglePermission(index: number, field: keyof Pick<ModulePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited'>): void {
    this.modules[index] = { ...this.modules[index], [field]: !this.modules[index][field] };
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset();
    this.modules = this.catalogBase.map(m => ({ ...m }));
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    this.svc.createProfile({
      name:        v.name        ?? '',
      description: v.description ?? '',
      permissions: this.modules,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/users']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar perfil. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}