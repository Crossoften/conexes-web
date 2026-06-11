// src/app/features/approval-tiers/new/approval-tiers-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ApprovalTiersService } from '../approval-tiers.service';
import { ApprovalTierPayload } from '../approval-tiers.model';

interface UserItem { id: number; name: string; email?: string; }

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

  form: FormGroup = this.fb.group({
    description:  ['', Validators.required],
    approver:     ['', Validators.required],
    purchaseRole: ['', Validators.required],
    tierLevel:    ['', Validators.required],
    minValue:     ['', Validators.required],
    maxValue:     ['', Validators.required],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
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

    const payload: ApprovalTierPayload = {
      description:  v.description   ?? '',
      level:        Number(v.tierLevel)  || 1,
      minValue:     Number(v.minValue)   || 0,
      maxValue:     Number(v.maxValue)   || 0,
      purchaseRole: v.purchaseRole   ?? 'Requester',
      userId:       Number(v.approver)   || 0,
    };

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