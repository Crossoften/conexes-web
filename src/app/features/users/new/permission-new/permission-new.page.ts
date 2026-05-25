// src/app/features/users/new/permission-new/permission-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
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
export class PermissionNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(UsersService);

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  // Cópia dos módulos para edição
  modules: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  form: FormGroup = this.fb.group({
    title:       [''],
    description: [''],
    costCenter:  [''],
    project:     [''],
    activity:    [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Se não há dados do step 1, redireciona de volta
    if (!this.svc.draftUserData()) {
      this.router.navigate(['/users/new-user']);
    }
  }

  // ── Módulos / permissões ──────────────────────────────────────────────────

  togglePermission(index: number, field: keyof Pick<ModulePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited'>): void {
    this.modules[index] = { ...this.modules[index], [field]: !this.modules[index][field] };
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset();
    this.modules = DEFAULT_MODULES.map(m => ({ ...m }));
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

    this.svc.create(payload).subscribe({
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
