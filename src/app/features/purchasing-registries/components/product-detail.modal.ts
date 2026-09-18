// src/app/features/purchasing-registries/components/product-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { PurchasingRegistriesService } from '../purchasing-registries.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { PurchaseRef } from '../../purchases/purchases.model';
import {
  ApiProductService,
  Product,
  ProductServicePayload,
  RegistryStatus,
  REGISTRY_STATUS_CONFIG,
} from '../purchasing-registries.model';

/**
 * CP-02: visualização e edição de produto/serviço no padrão de modal usado em
 * Contatos e Centro de custos — antes o botão Editar levava para a tela de
 * cadastro, fora do padrão dos demais módulos.
 */
@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './product-detail.modal.html',
  styleUrl: './product-detail.modal.scss',
})
export class ProductDetailModalComponent implements OnInit, OnChanges {
  @Input() item: Product | null = null;
  /** 'view' abre somente-leitura; 'edit' abre já em edição. */
  @Input() initialMode: 'view' | 'edit' = 'view';

  @Output() close   = new EventEmitter<void>();
  @Output() saved   = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<number>();

  private fb           = inject(NonNullableFormBuilder);
  private svc          = inject(PurchasingRegistriesService);
  private purchasesSvc = inject(PurchasesService);

  mode: 'view' | 'edit' = 'view';

  readonly statusConfig = REGISTRY_STATUS_CONFIG;
  readonly saving   = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly accountPlans  = signal<PurchaseRef[]>([]);
  readonly productGroups = signal<{ id: number; name: string }[]>([]);
  readonly manufacturers = signal<{ id: number; name: string }[]>([]);

  // CMP-06: unidades de medida pré-cadastradas (o campo aceita digitar outras).
  readonly unidadesMedida = ['UN', 'CX', 'PC', 'PCT', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M²', 'M³', 'DZ', 'PAR', 'RL', 'SC', 'FD', 'GL', 'TON', 'HR', 'SERV'];

  /** Registro completo vindo da API (a linha da tabela não traz todos os campos). */
  readonly full = signal<ApiProductService | null>(null);

  readonly form = this.fb.group({
    name:           ['', Validators.required],
    type:           ['Product', Validators.required],
    manufacturerId: [''],
    groupId:        [''],
    measure:        [''],
    costBase:       [''],
    origin:         [''],
    accountPlanId:  [''],
    description:    [''],
    status:         ['Active'],
  });

  isService(): boolean { return this.form.get('type')?.value === 'Service'; }

  ngOnInit(): void {
    this.purchasesSvc.getAccountPlansLookup().subscribe({ next: v => this.accountPlans.set(v), error: () => {} });
    this.svc.getProductGroups().subscribe({ next: v => this.productGroups.set(v), error: () => {} });
    this.svc.getManufacturers().subscribe({ next: v => this.manufacturers.set(v), error: () => {} });
  }

  ngOnChanges(): void {
    if (!this.item) return;
    this.mode = this.initialMode;
    this.errorMsg.set(null);
    this.full.set(null);
    // A listagem não traz Origem nem Descrição completos — busca o registro inteiro.
    this.svc.getProduct(this.item.apiId).subscribe({
      next: p => { this.full.set(p); this.patchForm(p); this.applyMode(); },
      error: () => this.errorMsg.set('Erro ao carregar o produto.'),
    });
  }

  private patchForm(p: ApiProductService): void {
    this.form.patchValue({
      name:           p.name ?? '',
      type:           p.type ?? 'Product',
      manufacturerId: p.manufacturerId != null ? String(p.manufacturerId) : '',
      groupId:        p.groupId != null ? String(p.groupId) : '',
      measure:        p.measure ?? '',
      costBase:       p.costBase != null ? String(p.costBase) : '',
      origin:         p.origin ?? '',
      accountPlanId:  p.accountPlanId != null ? String(p.accountPlanId) : '',
      description:    p.description ?? '',
      status:         p.status ?? 'Active',
    });
  }

  private applyMode(): void {
    this.mode === 'view' ? this.form.disable() : this.form.enable();
  }

  // ── Labels do modo visualização ───────────────────────────────────────────

  get typeLabel(): string { return this.isService() ? 'Serviço' : 'Produto'; }

  get statusLabel(): string {
    return this.statusConfig[(this.form.getRawValue().status as RegistryStatus)]?.label ?? '—';
  }

  get statusVariant(): string {
    return this.statusConfig[(this.form.getRawValue().status as RegistryStatus)]?.variant ?? 'neutral';
  }

  groupLabel(): string {
    const id = this.form.getRawValue().groupId;
    return this.productGroups().find(g => String(g.id) === id)?.name ?? this.full()?.group ?? '—';
  }

  manufacturerLabel(): string {
    const id = this.form.getRawValue().manufacturerId;
    return this.manufacturers().find(m => String(m.id) === id)?.name ?? this.full()?.manufacturer ?? '—';
  }

  accountLabel(): string {
    const id = this.form.getRawValue().accountPlanId;
    return this.accountPlans().find(a => String(a.id) === id)?.name ?? this.full()?.accountPlan?.title ?? '—';
  }

  money(v: string | number | null | undefined): string {
    return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ── Cadastros auxiliares (CMP-04/05) ──────────────────────────────────────

  quickCreateGroup(): void {
    const name = (prompt('Nome do novo grupo de produtos:') || '').trim();
    if (!name) return;
    this.svc.createProductGroup(name).subscribe({
      next: g => {
        this.productGroups.update(list => [...list, g].sort((a, b) => a.name.localeCompare(b.name)));
        this.form.patchValue({ groupId: String(g.id) });
      },
      error: err => this.errorMsg.set(err?.error?.message ?? 'Falha ao criar o grupo.'),
    });
  }

  quickCreateManufacturer(): void {
    const name = (prompt('Nome do novo fabricante:') || '').trim();
    if (!name) return;
    this.svc.createManufacturer(name).subscribe({
      next: m => {
        this.manufacturers.update(list => [...list, m].sort((a, b) => a.name.localeCompare(b.name)));
        this.form.patchValue({ manufacturerId: String(m.id) });
      },
      error: err => this.errorMsg.set(err?.error?.message ?? 'Falha ao criar o fabricante.'),
    });
  }

  // ── Ações ─────────────────────────────────────────────────────────────────

  onEdit(): void { this.mode = 'edit'; this.applyMode(); }

  onCancelEdit(): void {
    const p = this.full();
    if (p) this.patchForm(p);
    this.mode = 'view';
    this.errorMsg.set(null);
    this.applyMode();
  }

  onClose(): void  { this.close.emit(); }

  onDelete(): void { if (this.item) this.deleted.emit(this.item.apiId); }

  onSubmit(): void {
    if (!this.item) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.errorMsg.set(null);
    const v = this.form.getRawValue();
    const payload: ProductServicePayload = {
      name:           v.name,
      type:           v.type,
      groupId:        v.groupId ? Number(v.groupId) : undefined,
      manufacturerId: v.manufacturerId ? Number(v.manufacturerId) : undefined,
      measure:        v.measure || undefined,
      costBase:       v.costBase !== '' ? Number(v.costBase) : undefined,
      origin:         v.origin || undefined,
      accountPlanId:  v.accountPlanId !== '' ? Number(v.accountPlanId) : undefined,
      description:    v.description || undefined,
      status:         v.status as RegistryStatus,
    };

    this.svc.updateProduct(this.item.apiId, payload).subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: err => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar o produto.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
