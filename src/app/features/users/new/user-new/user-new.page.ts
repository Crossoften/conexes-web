// src/app/features/users/new/user-new/user-new.page.ts
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Subscription } from 'rxjs';
import { UsersService } from '../../users.service';
import { PermissionProfile, EntityLite, ModulePermission, DEFAULT_MODULES } from '../../users.model';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './user-new.page.html',
  styleUrl: './user-new.page.scss',
})
export class UserNewPage implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(UsersService);

  readonly loading         = signal(false);
  readonly errorMsg        = signal<string | null>(null);
  readonly profiles        = signal<PermissionProfile[]>([]);
  readonly profilesLoading = signal(false);
  readonly entities        = signal<EntityLite[]>([]);

  /** US-4 — matriz de permissões diretas (opcional; complementa o perfil). */
  modules: ModulePermission[] = DEFAULT_MODULES.map(m => ({ ...m }));

  /** Snapshot das permissões vindas do perfil selecionado (para o submit só enviar diretas se o admin editar). */
  private profileBaseline: ModulePermission[] | null = null;
  private profileSub?: Subscription;

  entityLabel(e: EntityLite): string {
    return e.tradeName || e.legalName || (e.cnpj ? `CNPJ ${e.cnpj}` : `Entidade #${e.id}`);
  }

  togglePermission(index: number, field: keyof Pick<ModulePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'isUnlimited'>): void {
    this.modules[index] = { ...this.modules[index], [field]: !this.modules[index][field] };
  }

  private hasDirectPermissions(): boolean {
    return this.modules.some(m => m.canView || m.canCreate || m.canEdit || m.canDelete || m.isUnlimited);
  }

  readonly roleOptions = [
  { label: 'Master',              value: 'Master'              },
  { label: 'Admin',               value: 'Admin'               },
  { label: 'Backoffice',          value: 'Backoffice'          },
  { label: 'Gestor de Entidades', value: 'EntityManager'       },
  { label: 'Gestor de Compras',   value: 'ProcurementManager'  },
  { label: 'Financeiro',          value: 'Finance'             },
  { label: 'Operacional',         value: 'Operational'         },
];

  form: FormGroup = this.fb.group({
    name:                ['', Validators.required],
    surname:             ['', Validators.required],
    username:            [''],
    document:            ['', Validators.required],
    jobTitle:            [''],
    area:                [''],
    phone:               [''],
    email:               ['', [Validators.required, Validators.email]],
    role:                ['', Validators.required],
    password:            [''],   // opcional — se em branco, o back gera e envia por e-mail
    entityId:            [null],
    permissionProfileId: [null],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProfiles();
    this.svc.getEntities().subscribe({ next: e => this.entities.set(e), error: () => {} });
    // US-7: matriz a partir do catálogo oficial (fallback interno = DEFAULT_MODULES).
    this.svc.getModulesCatalog().subscribe({ next: m => { if (m.length) this.modules = m; }, error: () => {} });

    // Ao escolher um perfil, reflete as permissões dele na matriz abaixo.
    this.profileSub = this.form.get('permissionProfileId')!.valueChanges.subscribe(id => {
      this.onProfileChange(id);
    });
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  /** Carrega as permissões do perfil e reflete na matriz; ao limpar, zera a matriz. */
  private onProfileChange(id: number | string | null): void {
    const profileId = id ? +id : null;
    if (!profileId) {
      this.profileBaseline = null;
      this.clearMatrix();
      return;
    }
    this.svc.getProfileById(profileId).subscribe({
      next: profile => this.applyProfilePermissions(profile.permissions ?? []),
      error: ()      => { this.profileBaseline = null; this.clearMatrix(); },
    });
  }

  /** Marca na matriz os flags de cada módulo conforme o perfil (casando por module+subMenu). */
  private applyProfilePermissions(perms: ModulePermission[]): void {
    const byKey = new Map(perms.map(p => [`${p.module}|${p.subMenu}`, p]));
    this.modules = this.modules.map(m => {
      const p = byKey.get(`${m.module}|${m.subMenu}`);
      return {
        ...m,
        canView:     !!p?.canView,
        canCreate:   !!p?.canCreate,
        canEdit:     !!p?.canEdit,
        canDelete:   !!p?.canDelete,
        isUnlimited: !!p?.isUnlimited,
      };
    });
    // Snapshot do reflexo — usado no submit para saber se o admin editou.
    this.profileBaseline = this.modules.map(m => ({ ...m }));
  }

  /** Zera todos os flags da matriz (mantém as linhas do catálogo). */
  private clearMatrix(): void {
    this.modules = this.modules.map(m => ({
      ...m, canView: false, canCreate: false, canEdit: false, canDelete: false, isUnlimited: false,
    }));
  }

  /** True se o admin alterou a matriz em relação ao que veio do perfil. */
  private matrixDiffersFromProfile(): boolean {
    if (!this.profileBaseline) return this.hasDirectPermissions();
    if (this.profileBaseline.length !== this.modules.length) return true;
    return this.modules.some((m, i) => {
      const b = this.profileBaseline![i];
      return m.canView !== b.canView || m.canCreate !== b.canCreate ||
             m.canEdit !== b.canEdit || m.canDelete !== b.canDelete ||
             m.isUnlimited !== b.isUnlimited;
    });
  }

  private loadProfiles(): void {
    this.profilesLoading.set(true);
    this.svc.getProfiles({ take: 100 }).subscribe({
      next: res => {
        this.profiles.set(res.data ?? (res as any));
        this.profilesLoading.set(false);
      },
      error: () => this.profilesLoading.set(false),
    });
  }

  // ── Máscaras ──────────────────────────────────────────────────────────────

  applyCpfMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = masked;
    this.form.get('document')?.setValue(masked, { emitEvent: false });
  }

  applyPhoneMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.form.get('phone')?.setValue(masked, { emitEvent: false });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    // permite atalhos (colar/copiar/recortar/selecionar) e edição/navegação
    if (event.ctrlKey || event.metaKey) return true;
    const nav = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (nav.includes(event.key)) return true;
    return /^\d$/.test(event.key);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset();
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

    const payload: any = {
      name:     v.name     ?? '',
      surname:  v.surname  ?? '',
      email:    v.email    ?? '',
      document: v.document ?? '',
      jobTitle: v.jobTitle ?? '',
      area:     v.area     ?? '',
      phone:    v.phone    ?? '',
      role:     v.role     || undefined,   // opcional no back; se omitido assume Operational
      status:   'Active',
    };

    if (v.username) payload.username = v.username;
    // Senha opcional: só envia se preenchida — em branco, o back gera e envia por e-mail.
    if (v.password) payload.password = v.password;
    if (v.entityId) payload.entityId = +v.entityId;

    if (v.permissionProfileId) {
      payload.permissionProfileId = +v.permissionProfileId;
    }
    // US-4: envia permissões diretas apenas se o admin editou a matriz.
    // Se a matriz é só o reflexo intocado do perfil, não duplica (o perfil já concede).
    if (this.matrixDiffersFromProfile()) {
      payload.modulePermissions = this.modules;
    }

    this.svc.createUser(payload).subscribe({
      next: () => {
        this.loading.set(false);
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