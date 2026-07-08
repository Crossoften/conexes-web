// src/app/features/quotations/new/quotation-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, NonNullableFormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { PurchasesService } from '../../purchases/purchases.service';
import {
  PurchaseRef,
  PurchaseRequest,
  PurchaseRequestItem,
  CreatePurchaseRequestPayload,
  PurchaseRequestItemPayload,
} from '../../purchases/purchases.model';

type QuotationTab = 'DADOS' | 'FONTE' | 'ITENS' | 'LOCAL' | 'ANEXOS';

@Component({
  selector: 'app-quotation-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './quotation-new.page.html',
  styleUrl: './quotation-new.page.scss',
})
export class QuotationNewPage {
  private fb     = inject(NonNullableFormBuilder);
  private svc    = inject(PurchasesService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  activeTab: QuotationTab = 'DADOS';

  readonly editId    = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly isEdit    = signal<boolean>(this.editId != null);
  readonly saving    = signal(false);
  readonly errorMsg  = signal<string | null>(null);

  // Lookups
  readonly users            = signal<PurchaseRef[]>([]);
  readonly projects         = signal<PurchaseRef[]>([]);
  readonly accountPlans     = signal<PurchaseRef[]>([]);
  readonly contracts        = signal<PurchaseRef[]>([]);
  readonly products         = signal<PurchaseRef[]>([]);
  readonly deliveryLocations = signal<PurchaseRef[]>([]);

  readonly form = this.fb.group({
    requesterId:           ['', Validators.required],
    area:                  [''],
    title:                 ['', Validators.required],
    orderType:             [''],
    requestDate:           ['', Validators.required],
    expectedDeliveryDate:  [''],
    estimatedValue:        [''],
    description:           ['', Validators.required],
    justification:         ['', Validators.required],
    contractorObligations: [''],
    commercialConditions:  [''],
    payingSource:          [''],
    projectId:             [''],
    accountPlanId:         [''],
    uniqueSupplier:        [false],
    supplierCount:         [''],
    contractId:            [''],
    deliveryLocationId:    [''],
    items:                 this.fb.array([this.newItem()]),
  });

  get items(): FormArray {
    return this.form.controls.items;
  }

  constructor() {
    this.loadLookups();
    if (this.editId != null) this.loadForEdit(this.editId);
  }

  private newItem(): FormGroup {
    return this.fb.group({
      productId:          [''],
      name:               ['', Validators.required],
      quantity:           ['', Validators.required],
      unit:               ['', Validators.required],
      group:              [''],
      referenceLink:      [''],
      estimatedUnitValue: [''],
      description:        [''],
    });
  }

  private loadLookups(): void {
    this.svc.getUsersLookup().subscribe({ next: v => this.users.set(v), error: () => {} });
    this.svc.getProjectsLookup().subscribe({ next: v => this.projects.set(v), error: () => {} });
    this.svc.getAccountPlansLookup().subscribe({ next: v => this.accountPlans.set(v), error: () => {} });
    this.svc.getProductsServicesLookup().subscribe({ next: v => this.products.set(v), error: () => {} });
    this.svc.getDeliveryLocationsLookup().subscribe({ next: v => this.deliveryLocations.set(v), error: () => {} });
    this.svc.getContracts({ take: 500 }).subscribe({
      next: res => this.contracts.set(res.data.map(c => ({ id: c.id, name: c.title }))),
      error: () => {},
    });
  }

  private loadForEdit(id: number): void {
    this.svc.getRequestById(id).subscribe({
      next: req => this.patchForm(req),
      error: () => this.errorMsg.set('Erro ao carregar a requisição para edição.'),
    });
  }

  private patchForm(r: PurchaseRequest): void {
    this.form.patchValue({
      requesterId:           r.requesterId != null ? String(r.requesterId) : '',
      area:                  r.area ?? '',
      title:                 r.title ?? '',
      orderType:             r.orderType ?? '',
      requestDate:           this.toDateInput(r.requestDate),
      expectedDeliveryDate:  this.toDateInput(r.expectedDeliveryDate),
      estimatedValue:        r.estimatedValue != null ? String(r.estimatedValue) : '',
      description:           r.description ?? '',
      justification:         r.justification ?? '',
      contractorObligations: r.contractorObligations ?? '',
      commercialConditions:  r.commercialConditions ?? '',
      payingSource:          r.payingSource ?? '',
      projectId:             r.projectId != null ? String(r.projectId) : '',
      accountPlanId:         r.accountPlanId != null ? String(r.accountPlanId) : '',
      uniqueSupplier:        r.uniqueSupplier ?? false,
      supplierCount:         r.supplierCount != null ? String(r.supplierCount) : '',
      contractId:            r.contractId != null ? String(r.contractId) : '',
      deliveryLocationId:    r.deliveryLocationId != null ? String(r.deliveryLocationId) : '',
    });

    this.items.clear();
    const list = r.items?.length ? r.items : [];
    if (!list.length) {
      this.items.push(this.newItem());
    } else {
      list.forEach(it => this.items.push(this.itemFrom(it)));
    }
  }

  private itemFrom(it: PurchaseRequestItem): FormGroup {
    return this.fb.group({
      productId:          [it.productId != null ? String(it.productId) : ''],
      name:               [it.name ?? '', Validators.required],
      quantity:           [it.quantity != null ? String(it.quantity) : '', Validators.required],
      unit:               [it.unit ?? '', Validators.required],
      group:              [it.group ?? ''],
      referenceLink:      [it.referenceLink ?? ''],
      estimatedUnitValue: [it.estimatedUnitValue != null ? String(it.estimatedUnitValue) : ''],
      description:        [it.description ?? ''],
    });
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  setTab(tab: QuotationTab) { this.activeTab = tab; }
  addItem()                 { this.items.push(this.newItem()); }
  removeItem(index: number) { if (this.items.length > 1) this.items.removeAt(index); }

  resetForm(): void {
    this.form.reset();
    this.items.clear();
    this.items.push(this.newItem());
    this.activeTab = 'DADOS';
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.items.invalid) this.activeTab = 'ITENS';
      else this.activeTab = 'DADOS';
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);
    const payload = this.buildPayload();

    const req$ = this.editId != null
      ? this.svc.updateRequest(this.editId, payload)
      : this.svc.createRequest(payload);

    req$.subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/quotations']); },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar a requisição.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  private buildPayload(): CreatePurchaseRequestPayload {
    const v = this.form.getRawValue();

    const items: PurchaseRequestItemPayload[] = v.items.map(it => ({
      productId:          this.num(String(it['productId'] ?? '')),
      name:               String(it['name'] ?? ''),
      quantity:           Number(it['quantity'] ?? 0),
      unit:               String(it['unit'] ?? ''),
      group:              String(it['group'] ?? '') || undefined,
      referenceLink:      String(it['referenceLink'] ?? '') || undefined,
      estimatedUnitValue: this.num(String(it['estimatedUnitValue'] ?? '')),
      description:        String(it['description'] ?? '') || undefined,
    }));

    return {
      title:                 v.title,
      requesterId:           Number(v.requesterId),
      area:                  v.area || undefined,
      orderType:             v.orderType || undefined,
      requestDate:           this.toIso(v.requestDate),
      expectedDeliveryDate:  this.toIso(v.expectedDeliveryDate),
      estimatedValue:        this.num(v.estimatedValue),
      description:           v.description || undefined,
      justification:         v.justification || undefined,
      contractorObligations: v.contractorObligations || undefined,
      commercialConditions:  v.commercialConditions || undefined,
      payingSource:          v.payingSource || undefined,
      projectId:             this.num(v.projectId),
      accountPlanId:         this.num(v.accountPlanId),
      uniqueSupplier:        v.uniqueSupplier,
      supplierCount:         this.num(v.supplierCount),
      contractId:            this.num(v.contractId),
      deliveryLocationId:    this.num(v.deliveryLocationId),
      items,
    };
  }

  private num(value: string): number | undefined {
    return value !== '' && value != null ? Number(value) : undefined;
  }

  private toIso(date: string): string | undefined {
    if (!date) return undefined;
    if (date.includes('T')) return date;
    const d = new Date(date + 'T00:00:00.000Z');
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  private toDateInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
}
