// src/app/features/users/new/user-new/user-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { UsersService } from '../../users.service';
import { PermissionProfile, EntityLite, ModulePermission, DEFAULT_MODULES } from '../../users.model';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './user-new.page.html',
  styleUrl: './user-new.page.scss',
})
export class UserNewPage implements OnInit {
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
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
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
    // US-4: só envia permissões diretas se alguma foi marcada (não sobrescreve o perfil à toa).
    if (this.hasDirectPermissions()) {
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