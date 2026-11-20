// src/app/features/cost-centers/components/cost-centers-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, SlicePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CostCenter, CostCenterPayload, CostCenterStatus, COST_CENTER_STATUS_CONFIG, COST_CENTER_TYPE_LABELS, LinkedAccount, resolveEntityType, entityKindOf, ENTITY_KINDS } from '../cost-centers.model';
import { PopupShellComponent } from '../../../shared/components/popup-shell/popup-shell.component';
import { BankAccountNewPage } from '../../bank-accounts/new/bank-account-new.page';
import { CostCentersService } from '../cost-centers.service';
import { environment } from '../../../../environments/environment';

interface AccountPlanItem {
  id:    number;
  code:  string;
  title: string;
}

interface EntityItem {
  id:        number;
  legalName: string;
  tradeName: string;
}

@Component({
  selector: 'app-cost-centers-detail-modal',
  standalone: true,
  imports: [NgClass, SlicePipe, ReactiveFormsModule, FormsModule, PopupShellComponent, BankAccountNewPage],
  templateUrl: './cost-centers-detail.modal.html',
  styleUrl: './cost-centers-detail.modal.scss',
})
export class CostCentersDetailModalComponent implements OnChanges, OnInit {
  @Input()  item: CostCenter | null = null;
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  @Input()  initialMode: 'view' | 'edit' = 'view';

  @Output() close   = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<number>();
  @Output() saved   = new EventEmitter<CostCenter>();

  private readonly fb   = inject(FormBuilder);
  private readonly svc  = inject(CostCentersService);
  private readonly http = inject(HttpClient);

  mode: 'view' | 'edit' = 'view';

  readonly statusConfig  = COST_CENTER_STATUS_CONFIG;
  readonly loading       = signal(false);
  readonly errorMsg      = signal<string | null>(null);
  readonly accountPlans  = signal<AccountPlanItem[]>([]);
  readonly bankAccounts  = signal<any[]>([]);   // CC-04: contas bancárias p/ a composição vinculada
  readonly entities      = signal<EntityItem[]>([]);
  readonly loadingLists  = signal(true);
  /** Card #768: superiores possíveis (centros de custo e projetos) e pop-up de conta bancária. */
  readonly costCenters   = signal<{ id: number; code: string; name: string; classification: string }[]>([]);
  readonly projects      = signal<{ id: number; code: string; name: string }[]>([]);
  readonly showBankPopup = signal(false);

  // Contas vinculadas no modo edição
  linkedAccounts: LinkedAccount[] = [];
  selectedLinkedAccount = '';
  selectedLinkedOrigin  = 'Caixa';

  form: FormGroup = this.fb.group({
    projectType:         ['', Validators.required],
    classification:      ['Analitica', Validators.required],
    projectCode:         ['', [Validators.required, Validators.pattern(/^[0-9.]+$/)]],
    projectTitle:        ['', Validators.required],
    accountingCode:      [''],
    payingSource:        [''],
    startDate:           [''],
    categoryDescription: [''],
    restrictInterest:    [false],
    budgetRestriction:   [false],
    costCenterId:        [null],
    parentProjectId:     [null],
    status:              ['Active'],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

    // Ambos os endpoints devolvem o envelope { data, count, pages } — lemos `data`
    // de forma tolerante. `take` alto no account-plan para trazer todas as contas
    // (senão o dropdown fica limitado à 1ª página).
    this.http.get<AccountPlanItem[] | { data?: AccountPlanItem[] }>(
      `${environment.apiUrl}/v1/account-plan`, { params: { take: '1000' } },
    ).subscribe({
      next: res => { this.accountPlans.set(Array.isArray(res) ? res : res?.data ?? []); checkDone(); },
      error: () => checkDone(),
    });

    // CC-04: contas bancárias para a composição de contas vinculadas.
    this.loadBankAccounts();

    // Card #768: listas para o campo "superior" (centro de custo / projeto pai).
    this.http.get<any[] | { data?: any[] }>(`${environment.apiUrl}/v1/projects`, { params: { take: '2000' } }).subscribe({
      next: res => {
        const all = Array.isArray(res) ? res : res?.data ?? [];
        this.costCenters.set(all.filter((r: any) => r._entityType === 'cost_center')
          .map((c: any) => ({ id: Number(c.id), code: c.code, name: c.name ?? c.title, classification: c.classification })));
        this.projects.set(all.filter((r: any) => r._entityType === 'project')
          .map((c: any) => ({ id: Number(c.id), code: c.code, name: c.title ?? c.name })));
      },
      error: () => {},
    });

    this.http.get<EntityItem[] | { data?: EntityItem[] }>(
      `${environment.apiUrl}/v1/institutional/entities`, { params: { take: '1000' } },
    ).subscribe({
      next: res => { this.entities.set(Array.isArray(res) ? res : res?.data ?? []); checkDone(); },
      error: () => checkDone(),
    });
  }

  ngOnChanges(): void {
    if (this.item) {
      this.patchForm(this.item);
      this.mode = this.initialMode;
      this.errorMsg.set(null);
      // CC-persist: a listagem (findAll) não traz `linkedAccounts` (é uma relação
      // que só o findOne inclui). Sem buscar o registro completo, a composição de
      // contas some ao abrir a edição e é apagada ao salvar. Recarrega tudo aqui.
      this.loadFullItem(this.item);
    }
  }

  /** CC-persist: busca o registro completo (com `linkedAccounts`) e reaplica no form/view. */
  private loadFullItem(item: CostCenter): void {
    this.svc.getById(item.id, resolveEntityType(item)).subscribe({
      next: full => {
        const merged = { ...item, ...full } as CostCenter;
        this.item = merged;
        this.patchForm(merged);
      },
      error: () => {},
    });
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  private loadBankAccounts(selectId?: number): void {
    this.http.get<any[] | { data?: any[] }>(
      `${environment.apiUrl}/v1/institutional/bank-accounts`, { params: { take: '500' } },
    ).subscribe({
      next: res => {
        this.bankAccounts.set(Array.isArray(res) ? res : res?.data ?? []);
        if (selectId) this.selectedLinkedAccount = String(selectId);
      },
      error: () => {},
    });
  }

  /** Card #768: nível real do registro e o rótulo do Tipo para a visualização. */
  get kindLabel(): string { return COST_CENTER_TYPE_LABELS[entityKindOf(this.item)]; }
  get parentLabel(): string {
    const c = this.item;
    if (!c) return '—';
    const kind = entityKindOf(c);
    if (kind === 'atividade') { const p = this.projects().find(x => x.id === c.parentProjectId); return p ? `${p.code} — ${p.name}` : '—'; }
    const ccId = kind === 'centro_de_custo' ? c.parentId : c.costCenterId;
    const cc = this.costCenters().find(x => x.id === ccId);
    return cc ? `${cc.code} — ${cc.name}` : '—';
  }

  /** Opções do campo superior para o Tipo escolhido na edição. */
  parentCostCenters() {
    const t = this.form.get('projectType')?.value;
    const self = entityKindOf(this.item) === 'centro_de_custo' ? this.item?.id : null;
    const list = this.costCenters().filter(c => c.id !== self);
    return t === 'centro_de_custo' ? list.filter(c => c.classification === 'Sintetica') : list;
  }
  parentProjects() {
    const self = entityKindOf(this.item) !== 'centro_de_custo' ? this.item?.id : null;
    return this.projects().filter(p => p.id !== self);
  }

  private patchForm(c: CostCenter): void {
    const kind = entityKindOf(c);
    this.form.patchValue({
      // Card #768 (itens 4 e 11): o Tipo mostrado é o nível real do registro.
      projectType:         kind,
      classification:      c.classification === 'Sintetica' ? 'Sintetica' : 'Analitica',
      projectCode:         c.code               ?? '',
      projectTitle:        c.name ?? c.title      ?? '',
      accountingCode:      c.accountingCode      ?? '',
      payingSource:        c.payingSource        ?? '',
      startDate:           c.startDate           ? c.startDate.substring(0, 10) : '',
      categoryDescription: c.categoryDescription ?? '',
      restrictInterest:    !!c.restrictInterestFine,
      budgetRestriction:   !!c.restrictBudget,
      costCenterId:        (kind === 'centro_de_custo' ? c.parentId : c.costCenterId) ?? null,
      parentProjectId:     c.parentProjectId     ?? null,
      status:              c.status              ?? 'Active',
    });
    // CC-persist: normaliza para { origin, accountPlanId }. O findOne devolve o
    // ProjectAccount inteiro (id, projectId, accountPlan) e reenviar esses campos
    // extras no PATCH quebraria o `create` do Prisma.
    this.linkedAccounts = (c.linkedAccounts ?? []).map((a: any) => ({ origin: a.origin, accountPlanId: a.accountPlanId, bankAccountId: a.bankAccountId }));
  }

  // ── Contas vinculadas ─────────────────────────────────────────────────────

  /** Código define a hierarquia (1, 1.1, 1.2) → só dígitos e ponto. */
  onCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const cleaned = el.value.replace(/[^0-9.]/g, '');
    el.value = cleaned;
    this.form.get('projectCode')?.setValue(cleaned, { emitEvent: false });
  }

  addLinkedAccount(): void {
    if (!this.selectedLinkedAccount) return;
    const id = Number(this.selectedLinkedAccount);
    if (this.linkedAccounts.some(a => a.bankAccountId === id)) return;
    this.linkedAccounts = [
      ...this.linkedAccounts,
      { origin: this.selectedLinkedOrigin, bankAccountId: id },
    ];
    this.selectedLinkedAccount = '';
  }

  removeLinkedAccount(index: number): void {
    this.linkedAccounts = this.linkedAccounts.filter((_, i) => i !== index);
  }

  /** Card #768 (item 7): cadastro de Contas Bancárias em pop-up, sem sair da edição. */
  openBankAccountRegister(): void { this.showBankPopup.set(true); }
  closeBankPopup(): void { this.showBankPopup.set(false); }
  onBankAccountCreated(acc: any): void {
    this.showBankPopup.set(false);
    this.loadBankAccounts(acc?.id);
  }

  getAccountLabel(id: number | undefined): string {
    if (id == null) return '—';
    const a = this.bankAccounts().find((p: any) => p.id === id);
    if (!a) return String(id);
    const nome  = a.nickname ?? a.apelido ?? a.bankName ?? a.bank?.name ?? a.name ?? 'Conta';
    const conta = [a.agency ?? a.agencia, a.accountNumber ?? a.conta ?? a.number].filter(Boolean).join(' / ');
    return conta ? `${nome} — ${conta}` : String(nome);
  }

  // ── Accessors view ────────────────────────────────────────────────────────

  get statusLabel(): string {
    if (!this.item) return '';
    return this.statusConfig[this.item.status]?.label ?? this.item.status;
  }

  get statusVariant(): string {
    if (!this.item) return 'neutral';
    return this.statusConfig[this.item.status]?.variant ?? 'neutral';
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  onEdit(): void {
    this.mode = 'edit';
    this.errorMsg.set(null);
  }

  onCancelEdit(): void {
    this.mode = 'view';
    if (this.item) this.patchForm(this.item);
    this.errorMsg.set(null);
  }

  onClose(): void {
    this.mode = 'view';
    this.errorMsg.set(null);
    this.close.emit();
  }

  onDelete(): void {
    if (this.item) this.deleted.emit(this.item.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Preencha os campos obrigatórios destacados (Tipo, Classificação, Código e Título).');
      return;
    }
    if (!this.item) return;
    if (this.selectedLinkedAccount) this.addLinkedAccount();

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: Partial<CostCenterPayload> = {
      code:                 v.projectCode         ?? '',
      name:                 v.projectTitle        ?? '',
      type:                 v.projectType         ?? '',
      // entityKind canônico substitui a detecção frágil por texto em `type`.
      entityKind:           ENTITY_KINDS.includes(v.projectType) ? v.projectType : undefined,
      classification:       v.classification === 'Sintetica' ? 'Sintetica' : 'Analitica',
      description:          v.categoryDescription ?? '',
      status:               (v.status as CostCenterStatus) ?? 'Active',
      accountingCode:       v.accountingCode       ?? '',
      payingSource:         (v.payingSource && v.payingSource !== 'undefined') ? String(v.payingSource) : '',
      startDate:            v.startDate ? new Date(v.startDate).toISOString() : null,
      categoryDescription:  v.categoryDescription  ?? '',
      restrictInterestFine: !!v.restrictInterest,
      restrictBudget:       !!v.budgetRestriction,
      costCenterId:         v.costCenterId ? Number(v.costCenterId) : null,
      parentProjectId:      v.parentProjectId ? Number(v.parentProjectId) : null,
      linkedAccounts:       this.linkedAccounts,
    };

    this.svc.update(this.item.id, resolveEntityType(this.item), payload).subscribe({
      next: updated => {
        this.loading.set(false);
        this.mode = 'view';
        this.saved.emit(updated);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}