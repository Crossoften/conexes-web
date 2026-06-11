// src/app/features/users/components/user-detail.modal.ts
import { Component, input, output, inject, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  User, UserUpdatePayload,
  ModulePermission, DEFAULT_MODULES,
  USER_STATUS_CONFIG, USER_ROLE_LABELS,
} from '../users.model';

type ModalTab = 'DADOS' | 'PERMISSOES';

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './user-detail.modal.html',
  styleUrl: './user-detail.modal.scss',
})
export class UserDetailModalComponent {
  readonly user   = input<User | null>(null);
  readonly close  = output<void>();
  readonly delete = output<number>();
  readonly saved  = output<{ id: number; payload: Partial<UserUpdatePayload> }>();

  private readonly fb = inject(NonNullableFormBuilder);

  mode: 'view' | 'edit' = 'view';
  activeTab: ModalTab   = 'DADOS';

  readonly statusConfig = USER_STATUS_CONFIG;
  readonly roleLabels   = USER_ROLE_LABELS;

  readonly roleOptions = [
    { label: 'Master',   value: 'Master'   },
    { label: 'Admin',    value: 'Admin'    },
    { label: 'Gerente',  value: 'Manager'  },
    { label: 'Operador', value: 'Operator' },
    { label: 'Viewer',   value: 'Viewer'   },
  ];

  readonly statusOptions = [
    { label: 'Ativo',   value: 'Active'   },
    { label: 'Inativo', value: 'Inactive' },
  ];

  modules: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  readonly form = this.fb.group({
    name:     ['', Validators.required],
    surname:  ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    document: [''],
    jobTitle: [''],
    area:     [''],
    phone:    [''],
    role:     ['', Validators.required],
    status:   [''],
    password: [''],
  });

  constructor() {
    effect(() => {
      const u = this.user();
      if (u) this.patchForm(u);
    });
  }

  private patchForm(u: User): void {
    this.form.patchValue({
      name:     u.name     ?? '',
      surname:  u.surname  ?? '',
      email:    u.email    ?? '',
      document: u.document ?? '',
      jobTitle: u.jobTitle ?? '',
      area:     u.area     ?? '',
      phone:    u.phone    ?? '',
      role:     u.role     ?? '',
      status:   u.status   ?? '',
      password: '',
    });

    if (u.modulePermissions?.length) {
      this.modules = DEFAULT_MODULES.map(def => {
        const found = u.modulePermissions.find(p => p.module === def.module);
        return found ? { ...found } : { ...def };
      });
    } else {
      this.modules = DEFAULT_MODULES.map(m => ({ ...m }));
    }
  }

  // ── Accessors view ────────────────────────────────────────────────────────

  get statusLabel(): string {
    return this.statusConfig[this.user()?.status ?? '']?.label ?? this.user()?.status ?? '—';
  }

  get statusVariant(): string {
    return this.statusConfig[this.user()?.status ?? '']?.variant ?? 'neutral';
  }

  get roleLabel(): string {
    return this.roleLabels[this.user()?.role ?? ''] ?? this.user()?.role ?? '—';
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  setTab(tab: ModalTab): void { this.activeTab = tab; }

  onClose(): void {
    this.mode      = 'view';
    this.activeTab = 'DADOS';
    this.close.emit();
  }

  onEdit(): void { this.mode = 'edit'; }

  onCancelEdit(): void {
    this.mode = 'view';
    const u = this.user();
    if (u) this.patchForm(u);
  }

  onDelete(): void {
    const u = this.user();
    if (u) this.delete.emit(u.id);
  }

  togglePermission(index: number, field: keyof Pick<ModulePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited'>): void {
    this.modules[index] = { ...this.modules[index], [field]: !this.modules[index][field] };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const u = this.user();
    if (!u) return;

    const v = this.form.getRawValue();

    const payload: Partial<UserUpdatePayload> = {
      name:              v.name,
      surname:           v.surname,
      email:             v.email,
      document:          v.document   || undefined,
      jobTitle:          v.jobTitle   || undefined,
      area:              v.area       || undefined,
      phone:             v.phone      || undefined,
      role:              v.role,
      status:            v.status     as any,
      modulePermissions: this.modules,
    };

    if (v.password) payload.password = v.password;

    this.saved.emit({ id: u.id, payload });
  }
}