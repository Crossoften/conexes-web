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
  // CMP-06: unidades de medida pré-cadastradas (o campo aceita digitar outras).
  readonly unidadesMedida = ['UN', 'CX', 'PC', 'PCT', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M²', 'M³', 'DZ', 'PAR', 'RL', 'SC', 'FD', 'GL', 'TON', 'HR', 'SERV'];

  private fb          = inject(NonNullableFormBuilder);
  private svc         = inject(PurchasingRegistriesService);
  private purchasesSvc = inject(PurchasesService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  readonly editId   = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly isEdit   = signal(this.editId != null);
  // CP-03: modo somente-visualização; CP-05: duplicar um produto existente.
  readonly viewOnly = signal(this.route.snapshot.queryParamMap.get('view') === '1');
  // CP-01: formulário de Serviço é simplificado (sem Fabricante, Tipo de medida e Origem, próprios de Produto).
  isService(): boolean { return this.form.get('type')?.value === 'Service'; }
  private  dupId    = Number(this.route.snapshot.queryParamMap.get('duplicate')) || null;
  // B25: aba Serviços abre o cadastro já no modo serviço (?type=Service).
  private readonly defaultType: string =
    this.editId == null && this.dupId == null && this.route.snapshot.queryParamMap.get('type') === 'Service' ? 'Service' : 'Product';
  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly accountPlans = signal<PurchaseRef[]>([]);
  // CMP-04/05: grupos e fabricantes cadastrados.
  readonly productGroups = signal<{ id: number; name: string }[]>([]);
  readonly manufacturers = signal<{ id: number; name: string }[]>([]);

  readonly form = this.fb.group({
    name:          ['', Validators.required],
    type:          [this.defaultType, Validators.required],
    manufacturerId: [''],
    groupId:       [''],
    measure:       [''],
    costBase:      [''],
    origin:        [''],
    accountPlanId: [''],
    description:   [''],
    status:        ['Active'],
  });

  constructor() {
    this.purchasesSvc.getAccountPlansLookup().subscribe({ next: v => this.accountPlans.set(v), error: () => {} });
    this.svc.getProductGroups().subscribe({ next: v => this.productGroups.set(v), error: () => {} });
    this.svc.getManufacturers().subscribe({ next: v => this.manufacturers.set(v), error: () => {} });
    if (this.editId != null) {
      this.svc.getProduct(this.editId).subscribe({
        next: p => { this.patchForm(p); if (this.viewOnly()) this.form.disable(); },
        error: () => this.errorMsg.set('Erro ao carregar o produto para edição.'),
      });
    } else if (this.dupId != null) {
      // CP-05: carrega o produto de origem e mantém como NOVO (salva cria outro).
      this.svc.getProduct(this.dupId).subscribe({
        next: p => this.patchForm({ ...p, name: `${p.name ?? ''} (cópia)` } as ApiProductService),
        error: () => {},
      });
    }
  }

  private patchForm(p: ApiProductService): void {
    this.form.patchValue({
      name:          p.name ?? '',
      type:          p.type ?? 'Product',
      manufacturerId: p.manufacturerId != null ? String(p.manufacturerId) : '',
      groupId:       p.groupId != null ? String(p.groupId) : '',
      measure:       p.measure ?? '',
      costBase:      p.costBase != null ? String(p.costBase) : '',
      origin:        p.origin ?? '',
      accountPlanId: p.accountPlanId != null ? String(p.accountPlanId) : '',
      description:   p.description ?? '',
      status:        p.status ?? 'Active',
    });
  }

  resetForm(): void {
    // CMP-13: confirmação para evitar limpar o cadastro por clique acidental.
    if (this.form.dirty && !confirm('Limpar os campos preenchidos?')) return;
    this.form.reset({ type: this.defaultType, status: 'Active' });
  }

  // CMP-04/05: cria um grupo/fabricante na hora (sem sair da tela) e já seleciona.
  quickCreateGroup(): void {
    const name = (prompt('Nome do novo grupo de produtos:') || '').trim();
    if (!name) return;
    this.svc.createProductGroup(name).subscribe({
      next: g => { this.productGroups.update(list => [...list, g].sort((a, b) => a.name.localeCompare(b.name))); this.form.patchValue({ groupId: String(g.id) }); },
      error: err => this.errorMsg.set(err?.error?.message ?? 'Falha ao criar o grupo.'),
    });
  }
  quickCreateManufacturer(): void {
    const name = (prompt('Nome do novo fabricante:') || '').trim();
    if (!name) return;
    this.svc.createManufacturer(name).subscribe({
      next: m => { this.manufacturers.update(list => [...list, m].sort((a, b) => a.name.localeCompare(b.name))); this.form.patchValue({ manufacturerId: String(m.id) }); },
      error: err => this.errorMsg.set(err?.error?.message ?? 'Falha ao criar o fabricante.'),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.errorMsg.set(null);
    const v = this.form.getRawValue();
    const payload: ProductServicePayload = {
      name:          v.name,
      type:          v.type,
      groupId:         v.groupId ? Number(v.groupId) : undefined,
      manufacturerId:  v.manufacturerId ? Number(v.manufacturerId) : undefined,
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
