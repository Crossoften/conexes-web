// src/app/features/users/components/permission-detail.modal.ts
import { Component, input, output, inject, effect, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermissionProfile, PermissionProfileUpdatePayload, ModulePermission, DEFAULT_MODULES } from '../users.model';
import { UsersService } from '../users.service';

@Component({
  selector: 'app-permission-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './permission-detail.modal.html',
  styleUrl: './permission-detail.modal.scss',
})
export class PermissionDetailModalComponent implements OnInit {
  readonly profile = input<PermissionProfile | null>(null);
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  readonly initialMode = input<'view' | 'edit'>('view');
  readonly close   = output<void>();
  readonly delete  = output<number>();
  readonly saved   = output<{ id: number; payload: Partial<PermissionProfileUpdatePayload> }>();

  private readonly fb  = inject(NonNullableFormBuilder);
  private readonly svc = inject(UsersService);

  mode: 'view' | 'edit' = 'view';
  activeTab: 'DADOS' | 'MODULOS' = 'DADOS';

  /** US-7: base da matriz vinda do catálogo oficial (fallback = DEFAULT_MODULES). */
  private catalogBase: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));
  modules: ModulePermission[] = this.catalogBase.map(m => ({ ...m }));

  readonly form = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
  });

  constructor() {
    this.svc.getModulesCatalog().subscribe({
      next: c => { if (c.length) { this.catalogBase = c; const p = this.profile(); if (p) this.applyModules(p); } },
      error: () => {},
    });
    effect(() => {
      const p = this.profile();
      if (p) this.patchForm(p);
    });
  }

  ngOnInit(): void {
    this.mode = this.initialMode();
  }

  private applyModules(p: PermissionProfile): void {
    if (p.permissions?.length) {
      this.modules = this.catalogBase.map(def => {
        const found = p.permissions.find(x => x.module === def.module && (!def.subMenu || x.subMenu === def.subMenu));
        return found ? { ...def, ...found } : { ...def };
      });
    } else {
      this.modules = this.catalogBase.map(m => ({ ...m }));
    }
  }

  private patchForm(p: PermissionProfile): void {
    this.form.patchValue({
      name:        p.name        ?? '',
      description: p.description ?? '',
    });
    this.applyModules(p);
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