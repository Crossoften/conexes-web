// src/app/features/approval-tiers/new/approval-tiers-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ApprovalTiersService } from '../approval-tiers.service';
import { ApprovalTierPayload, ApprovalTierType, ApprovalScopeOption } from '../approval-tiers.model';

interface UserItem { id: number; name: string; email?: string; }
interface LevelOption { value: string; label: string; }

@Component({
  selector: 'app-approval-tiers-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './approval-tiers-new.page.html',
  styleUrl: './approval-tiers-new.page.scss',
})
export class ApprovalTiersNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(ApprovalTiersService);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly users        = signal<UserItem[]>([]);
  readonly costCenters  = signal<ApprovalScopeOption[]>([]);
  readonly projects     = signal<ApprovalScopeOption[]>([]);
  readonly activities   = signal<ApprovalScopeOption[]>([]);
  readonly loadingLists = signal(true);

  readonly purchaseRoleOptions = [
    { label: 'Solicitante',           value: 'Requester'          },
    { label: 'Comprador',             value: 'Buyer'              },
    { label: 'Supervisor de Pedidos', value: 'RequestSupervisor'  },
    { label: 'Supervisor de Compras', value: 'PurchaseSupervisor' },
    { label: 'Recebedor de NF',       value: 'InvoiceReceiver'    },
    { label: 'Financeiro',            value: 'Finance'            },
    { label: 'Gerente',               value: 'Manager'            },
  ];

  readonly typeOptions = [
    { label: 'Compras',    value: 'COMPRAS'    },
    { label: 'Financeiro', value: 'FINANCEIRO' },
  ];

  form: FormGroup = this.fb.group({
    description:  ['', Validators.required],
    type:         ['COMPRAS', Validators.required],
    approver:     ['', Validators.required],
    tierLevel:    ['', Validators.required],
    minValue:     ['', Validators.required],
    maxValue:     ['', Validators.required],
    costCenterId: [''],
    projectId:    [''],
    activityId:   [''],
  });

  // AL-01: funções cumulativas (checkboxes) em vez de seleção única.
  readonly selectedRoles = signal<Set<string>>(new Set());
  readonly rolesTouched  = signal(false);
  isRole(value: string): boolean { return this.selectedRoles().has(value); }
  toggleRole(value: string): void {
    const next = new Set(this.selectedRoles());
    next.has(value) ? next.delete(value) : next.add(value);
    this.selectedRoles.set(next);
  }
  get rolesInvalid(): boolean { return this.isCompras && this.selectedRoles().size === 0; }

  /** Compras: papel de compra é obrigatório; Financeiro: campo não se aplica. */
  get isCompras(): boolean { return this.form.get('type')?.value === 'COMPRAS'; }

  /** Níveis por tipo — COMPRAS 1-4; FINANCEIRO 1-5 + "Gestor" (isManagerTier). */
  get levelOptions(): LevelOption[] {
    if (this.isCompras) {
      return [1, 2, 3, 4].map(n => ({ value: String(n), label: String(n) }));
    }
    return [
      ...[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: String(n) })),
      { value: 'manager', label: 'Gestor' },
    ];
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Papel de compra obrigatório só em COMPRAS; ao trocar o tipo, ajusta.
    this.applyTypeRules(this.form.get('type')!.value);
    this.form.get('type')!.valueChanges.subscribe(t => this.applyTypeRules(t));

    this.svc.getUsers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        this.users.set(list.map((u: any) => ({
          id:    u.id,
          name:  u.name && u.surname ? `${u.name} ${u.surname}` : (u.name ?? u.email ?? String(u.id)),
          email: u.email,
        })));
        this.loadingLists.set(false);
      },
      error: () => this.loadingLists.set(false),
    });

    // AL-4: lookups de escopo (opcionais, só COMPRAS).
    this.svc.getCostCenters().subscribe({ next: c => this.costCenters.set(c), error: () => {} });
    this.svc.getProjects().subscribe({   next: p => this.projects.set(p),    error: () => {} });
    this.svc.getActivities().subscribe({ next: a => this.activities.set(a),  error: () => {} });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private applyTypeRules(type: ApprovalTierType | string): void {
    const level = this.form.get('tierLevel')!;
    // AL-01: em FINANCEIRO as funções de compra não se aplicam — limpa a seleção.
    if (type !== 'COMPRAS') this.selectedRoles.set(new Set());
    // Nível selecionado pode não existir no novo tipo (ex.: 5 ou "manager" ao virar COMPRAS).
    const valid = this.levelOptions.some(o => o.value === level.value);
    if (!valid) level.setValue('');
  }

  resetForm(): void {
    this.form.reset({ type: 'COMPRAS' });
    this.selectedRoles.set(new Set());
    this.rolesTouched.set(false);
    this.applyTypeRules('COMPRAS');
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    this.rolesTouched.set(true);
    if (this.form.invalid || this.rolesInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: ApprovalTierPayload = {
      description: v.description ?? '',
      type:        v.type as ApprovalTierType,
      minValue:    Number(v.minValue) || 0,
      maxValue:    Number(v.maxValue) || 0,
      userId:      Number(v.approver) || 0,
    };
    // Nível: "manager" (Gestor do Financeiro) → isManagerTier; senão, número.
    if (v.tierLevel === 'manager') payload.isManagerTier = true;
    else if (v.tierLevel)          payload.level = Number(v.tierLevel);
    // AL-01: funções cumulativas só em COMPRAS (o back ignora em FINANCEIRO).
    if (v.type === 'COMPRAS' && this.selectedRoles().size) payload.purchaseRoles = [...this.selectedRoles()];
    // Escopo (opcional) só em COMPRAS.
    if (v.type === 'COMPRAS') {
      if (v.costCenterId) payload.costCenterId = Number(v.costCenterId);
      if (v.projectId)    payload.projectId    = Number(v.projectId);
      if (v.activityId)   payload.activityId   = Number(v.activityId);
    }

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/approval-tiers']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}