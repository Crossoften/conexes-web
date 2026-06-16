// src/app/features/users/components/permission-detail.modal.ts
import { Component, input, output, inject, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermissionProfile, PermissionProfileUpdatePayload, ModulePermission, DEFAULT_MODULES } from '../users.model';

@Component({
  selector: 'app-permission-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './permission-detail.modal.html',
  styleUrl: './permission-detail.modal.scss',
})
export class PermissionDetailModalComponent {
  readonly profile = input<PermissionProfile | null>(null);
  readonly close   = output<void>();
  readonly delete  = output<number>();
  readonly saved   = output<{ id: number; payload: Partial<PermissionProfileUpdatePayload> }>();

  private readonly fb = inject(NonNullableFormBuilder);

  mode: 'view' | 'edit' = 'view';
  activeTab: 'DADOS' | 'MODULOS' = 'DADOS';

  modules: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  readonly form = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
  });

  constructor() {
    effect(() => {
      const p = this.profile();
      if (p) this.patchForm(p);
    });
  }

  private patchForm(p: PermissionProfile): void {
    this.form.patchValue({
      name:        p.name        ?? '',
      description: p.description ?? '',
    });

    if (p.permissions?.length) {
      this.modules = DEFAULT_MODULES.map(def => {
        const found = p.permissions.find(x => x.module === def.module);
        return found ? { ...found } : { ...def };
      });
    } else {
      this.modules = DEFAULT_MODULES.map(m => ({ ...m }));
    }
  }

  setTab(tab: 'DADOS' | 'MODULOS'): void { this.activeTab = tab; }

  onClose(): void {
    this.mode      = 'view';
    this.activeTab = 'DADOS';
    this.close.emit();
  }

  onEdit(): void { this.mode = 'edit'; }

  onCancelEdit(): void {
    this.mode = 'view';
    const p = this.profile();
    if (p) this.patchForm(p);
  }

  onDelete(): void {
    const p = this.profile();
    if (p) this.delete.emit(p.id);
  }

  togglePermission(index: number, field: keyof Pick<ModulePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited'>): void {
    this.modules[index] = { ...this.modules[index], [field]: !this.modules[index][field] };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const p = this.profile();
    if (!p) return;

    const v = this.form.getRawValue();

    this.saved.emit({
      id: p.id,
      payload: {
        name:        v.name,
        description: v.description || undefined,
        permissions: this.modules,
      },
    });
  }
}