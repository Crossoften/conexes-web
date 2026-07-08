// src/app/features/purchasing-registries/new/purchasing-registries-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { PurchasingRegistriesService } from '../purchasing-registries.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { PurchaseRef } from '../../purchases/purchases.model';
import { ApiProductService, ProductServicePayload, RegistryStatus } from '../purchasing-registries.model';

@Component({
  selector: 'app-purchasing-registries-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './purchasing-registries-new.page.html',
  styleUrl: './purchasing-registries-new.page.scss',
})
export class PurchasingRegistriesNewPage {
  private fb          = inject(NonNullableFormBuilder);
  private svc         = inject(PurchasingRegistriesService);
  private purchasesSvc = inject(PurchasesService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  readonly editId   = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly isEdit   = signal(this.editId != null);
  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly accountPlans = signal<PurchaseRef[]>([]);

  readonly form = this.fb.group({
    name:          ['', Validators.required],
    type:          ['Product', Validators.required],
    manufacturer:  [''],
    group:         [''],
    measure:       [''],
    costBase:      [''],
    origin:        [''],
    accountPlanId: [''],
    description:   [''],
    status:        ['Active'],
  });

  constructor() {
    this.purchasesSvc.getAccountPlansLookup().subscribe({ next: v => this.accountPlans.set(v), error: () => {} });
    if (this.editId != null) {
      this.svc.getProduct(this.editId).subscribe({
        next: p => this.patchForm(p),
        error: () => this.errorMsg.set('Erro ao carregar o produto para edição.'),
      });
    }
  }

  private patchForm(p: ApiProductService): void {
    this.form.patchValue({
      name:          p.name ?? '',
      type:          p.type ?? 'Product',
      manufacturer:  p.manufacturer ?? '',
      group:         p.group ?? '',
      measure:       p.measure ?? '',
      costBase:      p.costBase != null ? String(p.costBase) : '',
      origin:        p.origin ?? '',
      accountPlanId: p.accountPlanId != null ? String(p.accountPlanId) : '',
      description:   p.description ?? '',
      status:        p.status ?? 'Active',
    });
  }

  resetForm(): void {
    this.form.reset({ type: 'Product', status: 'Active' });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.errorMsg.set(null);
    const v = this.form.getRawValue();
    const payload: ProductServicePayload = {
      name:          v.name,
      type:          v.type,
      manufacturer:  v.manufacturer || undefined,
      group:         v.group || undefined,
      measure:       v.measure || undefined,
      costBase:      v.costBase !== '' ? Number(v.costBase) : undefined,
      origin:        v.origin || undefined,
      accountPlanId: v.accountPlanId !== '' ? Number(v.accountPlanId) : undefined,
      description:   v.description || undefined,
      status:        v.status as RegistryStatus,
    };

    const req$ = this.editId != null
      ? this.svc.updateProduct(this.editId, payload)
      : this.svc.createProduct(payload);

    req$.subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/purchasing-registries']); },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar o produto.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
