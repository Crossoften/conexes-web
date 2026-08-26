// src/app/features/users/components/user-detail.modal.ts
import { Component, input, output, inject, effect, signal, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  User, UserUpdatePayload,
  ModulePermission, DEFAULT_MODULES,
  USER_STATUS_CONFIG, USER_ROLE_LABELS,
  PermissionProfile, EntityLite,
} from '../users.model';
import { UsersService } from '../users.service';

type ModalTab = 'DADOS' | 'PERMISSOES';

@Component({
  selector: 'app-user-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './user-detail.modal.html',
  styleUrl: './user-detail.modal.scss',
})
export class UserDetailModalComponent implements OnInit {
  readonly user   = input<User | null>(null);
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  readonly initialMode = input<'view' | 'edit'>('view');
  readonly close  = output<void>();
  readonly delete = output<number>();
  readonly saved  = output<{ id: number; payload: Partial<UserUpdatePayload> }>();

  private readonly fb  = inject(NonNullableFormBuilder);
  private readonly svc = inject(UsersService);

  mode: 'view' | 'edit' = 'view';
  activeTab: ModalTab   = 'DADOS';

  readonly statusConfig = USER_STATUS_CONFIG;
  readonly roleLabels   = USER_ROLE_LABELS;

  readonly profiles = signal<PermissionProfile[]>([]);
  readonly entities = signal<EntityLite[]>([]);

  entityLabel(e: EntityLite): string {
    return e.tradeName || e.legalName || (e.cnpj ? `CNPJ ${e.cnpj}` : `Entidade #${e.id}`);
  }

  readonly roleOptions = [
    { label: 'Master',              value: 'Master'             },
    { label: 'Admin',               value: 'Admin'              },
    { label: 'Backoffice',          value: 'Backoffice'         },
    { label: 'Gestor de Entidades', value: 'EntityManager'      },
    { label: 'Gestor de Compras',   value: 'ProcurementManager' },
    { label: 'Financeiro',          value: 'Finance'            },
    { label: 'Operacional',         value: 'Operational'        },
  ];

  readonly statusOptions = [
    { label: 'Ativo',    value: 'Active'   },
    { label: 'Pendente', value: 'Pending'  },
    { label: 'Inativo',  value: 'Inactive' },
  ];

  modules: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  readonly form = this.fb.group({
    name:                ['', Validators.required],
    surname:             ['', Validators.required],
    username:            [''],
    email:               ['', [Validators.required, Validators.email]],
    document:            [''],
    jobTitle:            [''],
    area:                [''],
    phone:               [''],
    role:                ['', Validators.required],
    status:              [''],
    password:            [''],
    entityId:            this.fb.control<number | null>(null),
    permissionProfileId: this.fb.control<number | null>(null),
  });

  /** US-7: base da matriz vinda do catálogo oficial (fallback = DEFAULT_MODULES). */
  private catalogBase: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  /** BK-2: marca que o usuário editou a matriz — bloqueia o re-patch por corrida. */
  private matrixDirty = false;

  constructor() {
    this.svc.getProfiles({ take: 100 }).subscribe({ next: r => this.profiles.set(r.data ?? (r as any)), error: () => {} });
    this.svc.getEntities().subscribe({ next: e => this.entities.set(e), error: () => {} });
    this.svc.getModulesCatalog().subscribe({
      // BK-2: se o usuário já editou a matriz, não reaplica (não apaga marcações).
      next: c => { if (c.length) { this.catalogBase = c; const u = this.user(); if (u && !this.matrixDirty) this.applyModules(u); } },
      error: () => {},
    });
    effect(() => {
      const u = this.user();
      // BK-2: absorve o detalhe completo enquanto o usuário não mexeu; depois protege a edição.
      if (u && !this.form.dirty && !this.matrixDirty) this.patchForm(u);
    });
  }

  ngOnInit(): void {
    this.mode = this.initialMode();
  }

  private permissionsSource(u: User | null): ModulePermission[] {
    return (u?.effectivePermissions?.length ? u.effectivePermissions : null)
        ?? (u?.permissionProfile?.permissions?.length ? u.permissionProfile.permissions : null)
        ?? u?.modulePermissions
        ?? [];
  }

  private mergeIntoCatalog(source: ModulePermission[]): ModulePermission[] {
    const used = new Set<ModulePermission>();
    const rows = this.catalogBase.map(def => {
      const found = source.find(p => p.module === def.module && (!def.subMenu || p.subMenu === def.subMenu));
      if (!found) return { ...def };
      used.add(found);
      return {
        ...def,
        canView:     !!found.canView,
        canCreate:   !!found.canCreate,
        canEdit:     !!found.canEdit,
        canDelete:   !!found.canDelete,
        isUnlimited: !!found.isUnlimited,
      };
    });
    for (const p of source) {
      if (!used.has(p)) {
        rows.push({
          module:      p.module,
          subMenu:     p.subMenu ?? '',
          canView:     !!p.canView,
          canCreate:   !!p.canCreate,
          canEdit:     !!p.canEdit,
          canDelete:   !!p.canDelete,
          isUnlimited: !!p.isUnlimited,
        });
      }
    }
    return rows;
  }

  private applyModules(u: User): void {
    const source = this.permissionsSource(u);
    this.modules = source.length ? this.mergeIntoCatalog(source) : this.catalogBase.map(m => ({ ...m }));
  }

  private patchForm(u: User): void {
    this.form.patchValue({
      name:                u.name     ?? '',
      surname:             u.surname  ?? '',
      username:            u.username ?? '',
      email:               u.email    ?? '',
      document:            u.document ?? '',
      jobTitle:            u.jobTitle ?? '',
      area:                u.area     ?? '',
      phone:               u.phone    ?? '',
      role:                u.role     ?? '',
      status:              u.status   ?? '',
      password:            '',
      entityId:            u.entityId ?? null,
      permissionProfileId: u.permissionProfileId ?? null,
    });

    this.applyModules(u);
    // BK-2: estado "limpo" após carregar os dados oficiais.
    this.form.markAsPristine();
    this.matrixDirty = false;
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

  // ── Permissões efetivas (BK-3 / §9.3) ─────────────────────────────────────
  /** Nome do perfil de permissão vinculado (quando houver). */
  get linkedProfileName(): string {
    const u = this.user();
    return u?.permissionProfile?.name
        ?? this.profiles().find(p => p.id === u?.permissionProfileId)?.name
        ?? '';
  }

  /**
   * Matriz para a aba de visualização: usa as permissões **efetivas** (perfil +
   * diretas) devolvidas pelo back. Cai de forma tolerante para as do perfil e,
   * por fim, para as diretas — mesclando sempre sobre o catálogo para a tabela
   * ficar completa.
   */
  get effectiveModules(): ModulePermission[] {
    const source = this.permissionsSource(this.user());
    if (!source.length) return [];
    return this.mergeIntoCatalog(source);
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
    this.matrixDirty = true;   // BK-2: protege a marcação de um re-patch tardio.
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
      username:          v.username   || undefined,
      email:             v.email,
      document:          v.document   || undefined,
      jobTitle:          v.jobTitle   || undefined,
      area:              v.area       || undefined,
      phone:             v.phone      || undefined,
      role:              v.role,
      status:            v.status     as any,
    };

    // BK-2: matriz intocada fica fora do payload — não vira permissão direta que mascara o perfil.
    if (this.matrixDirty) payload.modulePermissions = this.modules;
    if (v.password) payload.password = v.password;
    if (v.entityId) payload.entityId = v.entityId;
    // permissionProfileId: envia inclusive quando limpo? Só quando definido (US-3).
    if (v.permissionProfileId) payload.permissionProfileId = v.permissionProfileId;

    this.saved.emit({ id: u.id, payload });
  }
}