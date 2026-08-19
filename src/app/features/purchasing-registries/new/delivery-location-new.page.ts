// src/app/features/purchasing-registries/new/delivery-location-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { PurchasingRegistriesService } from '../purchasing-registries.service';
import { ApiDeliveryLocation, DeliveryLocationPayload } from '../purchasing-registries.model';

@Component({
  selector: 'app-delivery-location-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './delivery-location-new.page.html',
  styleUrl: './purchasing-registries-new.page.scss',
})
export class DeliveryLocationNewPage {
  private fb     = inject(NonNullableFormBuilder);
  private svc    = inject(PurchasingRegistriesService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  readonly editId   = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly isEdit   = signal(this.editId != null);
  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.group({
    name:        ['', Validators.required],
    responsible: [''],
    zipCode:     [''],
    address:     [''],
    number:      [''],
  });

  constructor() {
    if (this.editId != null) {
      this.svc.getLocation(this.editId).subscribe({
        next: l => this.patchForm(l),
        error: () => this.errorMsg.set('Erro ao carregar o local para edição.'),
      });
    }
  }

  private patchForm(l: ApiDeliveryLocation): void {
    this.form.patchValue({
      name:        l.name ?? '',
      responsible: l.responsible ?? '',
      zipCode:     l.zipCode ?? '',
      address:     l.address ?? '',
      number:      l.number ?? '',
    });
  }

  resetForm(): void {
    // CMP-13: confirmação para evitar limpar por clique acidental.
    if (this.form.dirty && !confirm('Limpar os campos preenchidos?')) return;
    this.form.reset();
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.errorMsg.set(null);
    const v = this.form.getRawValue();
    const payload: DeliveryLocationPayload = {
      name:        v.name,
      responsible: v.responsible || undefined,
      zipCode:     v.zipCode || undefined,
      address:     v.address || undefined,
      number:      v.number || undefined,
    };

    const req$ = this.editId != null
      ? this.svc.updateLocation(this.editId, payload)
      : this.svc.createLocation(payload);

    req$.subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/purchasing-registries']); },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar o local de entrega.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
