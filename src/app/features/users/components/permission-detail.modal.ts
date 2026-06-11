// src/app/features/users/components/permission-detail.modal.ts
import { Component, input, output, inject, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Permission, PermissionUpdatePayload } from '../users.model';

@Component({
  selector: 'app-permission-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './permission-detail.modal.html',
  styleUrl: './permission-detail.modal.scss',
})
export class PermissionDetailModalComponent {
  readonly permission = input<Permission | null>(null);
  readonly close      = output<void>();
  readonly delete     = output<number>();
  readonly saved      = output<{ id: number; payload: Partial<PermissionUpdatePayload> }>();

  private readonly fb = inject(NonNullableFormBuilder);

  mode: 'view' | 'edit' = 'view';

  readonly form = this.fb.group({
    module:      ['', Validators.required],
    subMenu:     ['', Validators.required],
    canView:     [false],
    canCreate:   [false],
    canEdit:     [false],
    canDelete:   [false],
    isUnlimited: [false],
  });

  constructor() {
    effect(() => {
      const p = this.permission();
      if (p) this.patchForm(p);
    });
  }

  private patchForm(p: Permission): void {
    this.form.patchValue({
      module:      p.module,
      subMenu:     p.subMenu,
      canView:     p.canView,
      canCreate:   p.canCreate,
      canEdit:     p.canEdit,
      canDelete:   p.canDelete,
      isUnlimited: p.isUnlimited,
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  onClose(): void {
    this.mode = 'view';
    this.close.emit();
  }

  onEdit(): void { this.mode = 'edit'; }

  onCancelEdit(): void {
    this.mode = 'view';
    const p = this.permission();
    if (p) this.patchForm(p);
  }

  onDelete(): void {
    const p = this.permission();
    if (p) this.delete.emit(p.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const p = this.permission();
    if (!p) return;

    const v = this.form.getRawValue();

    const payload: Partial<PermissionUpdatePayload> = {
      module:      v.module,
      subMenu:     v.subMenu,
      canView:     v.canView,
      canCreate:   v.canCreate,
      canEdit:     v.canEdit,
      canDelete:   v.canDelete,
      isUnlimited: v.isUnlimited,
    };

    this.saved.emit({ id: p.id, payload });
  }
}