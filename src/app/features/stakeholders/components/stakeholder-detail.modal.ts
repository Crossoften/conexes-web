// src/app/features/stakeholders/components/stakeholder-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Stakeholder,
  StakeholderPayload,
  StakeholderService,
  STAKEHOLDER_STATUS_CONFIG,
  STAKEHOLDER_TYPE_LABELS,
} from '../stakeholders.model';
import { PurchasesService } from '../../purchases/purchases.service';
import { PurchaseRef } from '../../purchases/purchases.model';
import { environment } from '../../../../environments/environment';

type ModalTab = 'GERAIS' | 'RISCO' | 'OBSERVACOES';

interface AccountPlanOption { id: number; code: string; title: string; accountType?: string | null; children?: AccountPlanOption[]; }

@Component({
  selector: 'app-stakeholder-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './stakeholder-detail.modal.html',
  styleUrl: './stakeholder-detail.modal.scss',
})
export class StakeholderDetailModalComponent implements OnChanges, OnInit {
  @Input() stakeholder: Stakeholder | null = null;
  /** CF-04: permite que a ação "Editar" da listagem abra o modal já em edição. */
  @Input() initialMode: 'view' | 'edit' = 'view';

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<{ id: number; payload: Partial<StakeholderPayload> }>();

  private readonly fb      = inject(NonNullableFormBuilder);
  private readonly http    = inject(HttpClient);
  private readonly lookups = inject(PurchasesService);

  mode: 'view' | 'edit' = 'view';
  activeTab: ModalTab   = 'GERAIS';
  bankError: string | null = null;

  readonly statusConfig  = STAKEHOLDER_STATUS_CONFIG;
  readonly typeLabels    = STAKEHOLDER_TYPE_LABELS;
  readonly accountPlans  = signal<AccountPlanOption[]>([]);

  // CF-06: vínculos opcionais de rateio (Centro de custo / Projeto / Atividade).
  readonly costCenters   = signal<PurchaseRef[]>([]);
  readonly projects      = signal<PurchaseRef[]>([]);
  readonly activities    = signal<PurchaseRef[]>([]);

  /** 5.2: lista de serviços do fornecedor (add/remove múltiplos). */
  services: StakeholderService[] = [];

  addService(): void {
    const v = this.form.getRawValue();
    const name = (v.serviceName ?? '').trim();
    if (!name) return;
    this.services = [...this.services, {
      name,
      description:   (v.serviceDescription  ?? '').trim(),
      externalCode:  (v.serviceExternalCode ?? '').trim(),
      grantorOrgan:  (v.serviceGrantorOrgan ?? '').trim(),
      hasRetention:  !!v.serviceHasRetention,
      accessorOrgan: (v.serviceAccessorOrgan ?? '').trim(),
    }];
    this.form.patchValue({
      serviceName: '', serviceDescription: '', serviceExternalCode: '',
      serviceGrantorOrgan: '', serviceHasRetention: false, serviceAccessorOrgan: '',
    });
  }

  removeService(index: number): void {
    this.services = this.services.filter((_, i) => i !== index);
  }

  ngOnInit(): void {
    // 5.1: conta contábil vira select do Plano de Contas (mostra código — título).
    this.http
      .get<AccountPlanOption[]>(`${environment.apiUrl}/v1/account-plan/tree`)
      .subscribe({
        next: res => this.accountPlans.set(flattenTree(res ?? [])),
        error: ()  => this.accountPlans.set([]),
      });

    // CF-06: lookups reaproveitados de Compras (Centro de custo / Projeto / Atividade).
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.costCenters.set(v), error: () => {} });
    this.lookups.getProjectsLookup().subscribe({ next: v => this.projects.set(v), error: () => {} });
    this.lookups.getActivitiesLookup().subscribe({ next: v => this.activities.set(v), error: () => {} });
  }

  /** Rótulo "código — título" da conta contábil vinculada (para exibição). */
  accountPlanLabel(id: number | null | undefined): string {
    if (!id) return '—';
    const p = this.accountPlans().find(a => a.id === Number(id));
    return p ? `${p.code} — ${p.title}` : String(id);
  }

  /** CF-06: rótulo de um vínculo de rateio (Centro de custo / Projeto / Atividade). */
  refLabel(list: PurchaseRef[], id: number | null | undefined): string {
    if (!id) return '—';
    const r = list.find(o => o.id === Number(id));
    return r ? r.name : String(id);
  }

  /** CF-06: a conta contábil do rateio lista apenas contas ANALÍTICAS. */
  analyticAccountPlans(): AccountPlanOption[] {
    return this.accountPlans().filter(a => a.accountType === 'Analitica');
  }

  /** Terminologia coerente com o tipo do contato (visão Clientes × Fornecedores). */
  entityLabel(): string {
    const type = this.stakeholder?.type ?? '';
    return ['Customer', 'Donor', 'SupportedProject'].includes(type) ? 'cliente' : 'fornecedor';
  }

  entityLabelCap(): string {
    const l = this.entityLabel();
    return l.charAt(0).toUpperCase() + l.slice(1);
  }

  // ── Formulário ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    // Aba GERAIS
    code:                  [{ value: '', disabled: true }],
    type:                  [''],
    supplierType:          [''],
    personType:            ['', Validators.required],
    document:              ['', Validators.required],
    name:                  ['', Validators.required],
    tradeName:             [''],
    email:                 ['', Validators.email],
    phone:                 [''],
    status:                [''],
    stateRegistration:     [''],
    municipalRegistration: [''],
    mainActivity:          [''],
    secondaryActivity:     [''],
    legalNature:           [''],
    standardApportionment: [''],
    accountId:             [0],
    // CF-06: vínculos opcionais de rateio (Centro de custo / Projeto / Atividade)
    rateioCostCenterId:    [0],
    rateioProjectId:       [0],
    rateioActivityId:      [0],

    // Endereço [0]
    addrZipCode:    [''],
    addrStreet:     [''],
    addrNumber:     [''],
    addrComplement: [''],
    addrDistrict:   [''],
    addrCity:       [''],
    addrState:      [''],

    // FE-S6: endereço de faturamento (exclusivo de clientes)
    billZipCode:    [''],
    billStreet:     [''],
    billNumber:     [''],
    billComplement: [''],
    billDistrict:   [''],
    billCity:       [''],
    billState:      [''],

    // Dados bancários [0]
    bankAccountName:     [''],
    bankAccountDocument: [''],
    bank:                [''],
    bankAgency:          [''],
    bankAgencyDigit:     [''],
    bankAccount:         [''],
    bankAccountDigit:    [''],
    bankAccountType:     [''],
    bankPixType:         [''],
    bankPixKey:          [''],
    bankPaymentMethod:   [''],

    // Aba RISCO
    privacyEvaluated:         [false],
    privacyEvalDate:          [''],
    privacyRisk:              [''],
    privacyObservations:      [''],
    complianceKypInitialDate: [''],
    complianceKypFinalDate:   [''],
    complianceRisk:           [''],
    complianceObservations:   [''],

    // Aba OBSERVACOES — contato [0]
    contactName:        [''],
    contactEmail:       [''],
    contactPhone:       [''],
    contactCellphone:   [''],
    contactPosition:    [''],
    contactObservation: [''],

    // Impostos e serviços
    serviceClassCode:     [''],
    serviceTitle:         [''],
    operationNature:      [''],
    totalRetentions:      [0],
    irfAliquot:           [0],
    irfCode:              [''],
    pisAliquot:           [0],
    pisCode:              [''],
    pccAliquot:           [0],
    pccCode:              [''],
    cofinsAliquot:        [0],
    cofinsCode:           [''],
    inssAliquot:          [0],
    csllAliquot:          [0],
    ibsAliquot:           [0],
    cbsAliquot:           [0],
    serviceName:          [''],
    serviceDescription:   [''],
    serviceExternalCode:  [''],
    serviceGrantorOrgan:  [''],
    serviceHasRetention:  [false],
    serviceAccessorOrgan: [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(): void {
    if (this.stakeholder) {
      this.patchForm(this.stakeholder);
      this.mode = this.initialMode;
    }
  }

  private patchForm(s: Stakeholder): void {
    // FE-S6: separa endereço principal do de faturamento (isBilling).
    const addr    = s.addresses?.find(a => !a.isBilling) ?? s.addresses?.[0];
    const bill    = s.addresses?.find(a => a.isBilling);
    const bank    = s.bankData?.[0];
    const contact = s.contacts?.[0];
    const risk    = s.riskClassification;
    const tax     = s.taxesAndServices;

    // patchValue ignora controls disabled, então setamos code diretamente
    this.form.controls['code'].setValue(s.code ?? '');

    this.form.patchValue({
      code:                  s.code,
      type:                  s.type,
      supplierType:          s.supplierType ?? '',
      personType:            s.personType,
      document:              s.document,
      name:                  s.name,
      tradeName:             s.tradeName,
      email:                 s.email,
      phone:                 s.phone,
      status:                s.status,
      stateRegistration:     s.stateRegistration,
      municipalRegistration: s.municipalRegistration,
      mainActivity:          s.mainActivity,
      secondaryActivity:     s.secondaryActivity,
      legalNature:           s.legalNature,
      standardApportionment: s.standardApportionment,
      accountId:             s.accountId,
      // CF-06: vínculos opcionais de rateio (0 = "Selecione").
      rateioCostCenterId:    s.rateioCostCenterId ?? 0,
      rateioProjectId:       s.rateioProjectId    ?? 0,
      rateioActivityId:      s.rateioActivityId   ?? 0,

      addrZipCode:    addr?.zipCode    ?? '',
      addrStreet:     addr?.street     ?? '',
      addrNumber:     addr?.number     ?? '',
      addrComplement: addr?.complement ?? '',
      addrDistrict:   addr?.district   ?? '',
      addrCity:       addr?.city       ?? '',
      addrState:      addr?.state      ?? '',

      billZipCode:    bill?.zipCode    ?? '',
      billStreet:     bill?.street     ?? '',
      billNumber:     bill?.number     ?? '',
      billComplement: bill?.complement ?? '',
      billDistrict:   bill?.district   ?? '',
      billCity:       bill?.city       ?? '',
      billState:      bill?.state      ?? '',

      bankAccountName:     bank?.accountName     ?? '',
      bankAccountDocument: bank?.accountDocument ?? '',
      bank:                bank?.bank            ?? '',
      bankAgency:          bank?.agency          ?? '',
      bankAgencyDigit:     bank?.agencyDigit     ?? '',
      bankAccount:         bank?.account         ?? '',
      bankAccountDigit:    bank?.accountDigit    ?? '',
      bankAccountType:     bank?.accountType     ?? '',
      bankPixType:         bank?.pixType         ?? '',
      bankPixKey:          bank?.pixKey          ?? '',
      bankPaymentMethod:   bank?.paymentMethod   ?? '',

      privacyEvaluated:         risk?.privacyEvaluated         ?? false,
      privacyEvalDate:          risk?.privacyEvalDate          ?? '',
      privacyRisk:              risk?.privacyRisk              ?? '',
      privacyObservations:      risk?.privacyObservations      ?? '',
      complianceKypInitialDate: risk?.complianceKypInitialDate ?? '',
      complianceKypFinalDate:   risk?.complianceKypFinalDate   ?? '',
      complianceRisk:           risk?.complianceRisk           ?? '',
      complianceObservations:   risk?.complianceObservations   ?? '',

      contactName:        contact?.name        ?? '',
      contactEmail:       contact?.email       ?? '',
      contactPhone:       contact?.phone       ?? '',
      contactCellphone:   contact?.cellphone   ?? '',
      contactPosition:    contact?.position    ?? '',
      contactObservation: contact?.observation ?? '',

      serviceClassCode:     tax?.serviceClassCode     ?? '',
      serviceTitle:         tax?.serviceTitle         ?? '',
      operationNature:      tax?.operationNature      ?? '',
      totalRetentions:      tax?.totalRetentions      ?? 0,
      irfAliquot:           tax?.irfAliquot           ?? 0,
      irfCode:              tax?.irfCode              ?? '',
      pisAliquot:           tax?.pisAliquot           ?? 0,
      pisCode:              tax?.pisCode              ?? '',
      pccAliquot:           tax?.pccAliquot           ?? 0,
      pccCode:              tax?.pccCode              ?? '',
      cofinsAliquot:        tax?.cofinsAliquot        ?? 0,
      cofinsCode:           tax?.cofinsCode           ?? '',
      inssAliquot:          tax?.inssAliquot          ?? 0,
      csllAliquot:          tax?.csllAliquot          ?? 0,
      ibsAliquot:           tax?.ibsAliquot           ?? 0,
      cbsAliquot:           tax?.cbsAliquot           ?? 0,
      // 5.2: campos de "novo serviço" começam vazios; a lista existente vai em `services`.
      serviceName:          '',
      serviceDescription:   '',
      serviceExternalCode:  '',
      serviceGrantorOrgan:  '',
      serviceHasRetention:  false,
      serviceAccessorOrgan: '',
    });
    this.services = [...(tax?.services ?? [])];
  }

  // ── Accessors para modo view ───────────────────────────────────────────────

  get statusLabel(): string {
    if (!this.stakeholder) return '';
    return this.statusConfig[this.stakeholder.status]?.label ?? this.stakeholder.status;
  }

  get statusVariant(): string {
    if (!this.stakeholder) return '';
    return this.statusConfig[this.stakeholder.status]?.variant ?? 'neutral';
  }

  get typeLabel(): string {
    if (!this.stakeholder) return '';
    return this.typeLabels[this.stakeholder.type] ?? this.stakeholder.type;
  }

  get supplierTypeLabel(): string {
    const map: Record<string, string> = {
      Product: 'Fornecedor de produto',
      Service: 'Prestador de serviço',
      Both:    'Produto e serviço',
    };
    const v = this.stakeholder?.supplierType;
    return v ? (map[v] ?? v) : '';
  }

  get primaryAddress() {
    return this.stakeholder?.addresses?.find(a => !a.isBilling) ?? this.stakeholder?.addresses?.[0] ?? null;
  }

  /** FE-S6: clientes (Customer/Donor/SupportedProject) têm endereço de faturamento. */
  get isClient(): boolean {
    return ['Customer', 'Donor', 'SupportedProject'].includes(this.form.getRawValue().type as string);
  }

  /**
   * FORN-fix: endereço "completo ou vazio" também na edição (alinha com o cadastro).
   * O back exige todos os campos quando um endereço é enviado; então só mandamos o
   * endereço principal quando o bloco está completo — senão o array vai sem ele e a
   * edição salva sem endereço (endereço é opcional, igual ao cadastro).
   */
  private buildAddresses(v: any) {
    const mainComplete = !!(v.addrZipCode && v.addrStreet && v.addrNumber
      && v.addrDistrict && v.addrCity && v.addrState);
    const main = mainComplete ? [{
      zipCode:    v.addrZipCode,
      street:     v.addrStreet,
      number:     v.addrNumber,
      complement: v.addrComplement ?? '',
      district:   v.addrDistrict,
      city:       v.addrCity,
      state:      v.addrState,
    }] : [];
    const billComplete = !!(v.billZipCode && v.billStreet && v.billNumber && v.billDistrict && v.billCity && v.billState);
    const billing = (this.isClient && billComplete) ? [{
      zipCode:    v.billZipCode,
      street:     v.billStreet,
      number:     v.billNumber,
      complement: v.billComplement ?? '',
      district:   v.billDistrict,
      city:       v.billCity,
      state:      v.billState,
      isBilling:  true,
    }] : [];
    return [...main, ...billing];
  }

  get fullAddress(): string {
    const a = this.primaryAddress;
    if (!a) return '';
    return [a.street, a.number, a.complement, a.district, a.city, a.state]
      .filter(Boolean).join(', ');
  }

  get primaryBankData() {
    return this.stakeholder?.bankData?.[0] ?? null;
  }

  get bankSummary(): string {
    const b = this.primaryBankData;
    if (!b) return '';
    return [b.bank, `Ag. ${b.agency}`, `C/C ${b.account}-${b.accountDigit}`]
      .filter(Boolean).join(' — ');
  }

  get primaryContact() {
    return this.stakeholder?.contacts?.[0] ?? null;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  setTab(tab: ModalTab): void {
    this.activeTab = tab;
  }

  onClose(): void {
    this.mode = 'view';
    this.activeTab = 'GERAIS';
    this.bankError = null;
    this.close.emit();
  }

  onEdit(): void {
    this.mode = 'edit';
    this.bankError = null;
  }

  onCancelEdit(): void {
    this.mode = 'view';
    this.bankError = null;
    if (this.stakeholder) this.patchForm(this.stakeholder);
  }

  onDelete(): void {
    if (this.stakeholder) this.delete.emit(this.stakeholder.id);
  }

  // Converte YYYY-MM-DD (retorno do input date) para ISO 8601 completo.
  // Envia null se o campo estiver vazio — o back aceita null mas rejeita string vazia.
  private toIso(date: string | null | undefined): string | null {
    if (!date) return null;
    // Já está em formato ISO completo
    if (date.includes('T')) return date;
    return new Date(date + 'T00:00:00.000Z').toISOString();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.stakeholder) return;

    const v = this.form.getRawValue(); // getRawValue inclui campos disabled (code)

    // ── Dados bancários: bloco completo OU vazio ──────────────────────────────
    // O back (CreateStakeholderBankDataDto) exige o conjunto obrigatório mesmo no
    // PATCH. paymentMethod/PIX vivem dentro de bankData, então não dá para salvar
    // só a forma de pagamento sem uma conta completa. Se o usuário preencheu parte,
    // bloqueamos com mensagem clara em vez de enviar incompleto (400) ou descartar.
    const bankFields = {
      accountName:     v.bankAccountName?.trim()     || '',
      accountDocument: v.bankAccountDocument?.trim() || '',
      bank:            v.bank?.trim()                || '',
      agency:          v.bankAgency?.trim()          || '',
      agencyDigit:     v.bankAgencyDigit?.trim()     || '',
      account:         v.bankAccount?.trim()         || '',
      accountDigit:    v.bankAccountDigit?.trim()    || '',
      accountType:     v.bankAccountType             || '',
      pixType:         v.bankPixType                 || '',
      pixKey:          v.bankPixKey?.trim()          || '',
      paymentMethod:   v.bankPaymentMethod           || '',
    };
    const anyBankFilled = Object.values(bankFields).some(Boolean);
    const bankComplete  = !!(bankFields.accountName && bankFields.accountDocument
      && bankFields.bank && bankFields.agency && bankFields.account
      && bankFields.accountType && bankFields.paymentMethod);

    if (anyBankFilled && !bankComplete) {
      this.bankError = 'Para salvar dados bancários, preencha: nome do correntista, documento, banco, agência, conta, tipo de conta e forma de pagamento.';
      this.activeTab = 'GERAIS';
      return;
    }
    this.bankError = null;

    const bankData = anyBankFilled ? [{
      accountName:     bankFields.accountName,
      accountDocument: bankFields.accountDocument,
      bank:            bankFields.bank,
      agency:          bankFields.agency,
      agencyDigit:     bankFields.agencyDigit,
      account:         bankFields.account,
      accountDigit:    bankFields.accountDigit,
      accountType:     bankFields.accountType   as any,
      pixType:         (bankFields.pixType || undefined) as any,
      pixKey:          bankFields.pixKey,
      paymentMethod:   bankFields.paymentMethod as any,
    }] : [];

    // contacts: fallback para o contato original se nome ainda vazio
    const originalContact = this.stakeholder!.contacts?.[0];
    const contactName = v.contactName || originalContact?.name || '';
    const contacts = contactName ? [{
      name:        contactName,
      email:       v.contactEmail       || '',
      phone:       v.contactPhone       || '',
      cellphone:   v.contactCellphone   || '',
      position:    v.contactPosition    || '',
      observation: v.contactObservation || '',
    }] : (this.stakeholder!.contacts ?? []);

    const payload: Partial<StakeholderPayload> = {
      code:                  v.code,
      type:                  v.type as any,
      supplierType:          v.type === 'Supplier' ? (v.supplierType || undefined) : undefined,
      personType:            v.personType as any,
      // B-13: documento só com dígitos (o back grava/valida sem máscara).
      document:              (v.document ?? '').replace(/\D/g, ''),
      name:                  v.name,
      tradeName:             v.tradeName,
      email:                 v.email,
      phone:                 v.phone,
      status:                v.status as any,
      stateRegistration:     v.stateRegistration,
      municipalRegistration: v.municipalRegistration,
      mainActivity:          v.mainActivity,
      secondaryActivity:     v.secondaryActivity,
      legalNature:           v.legalNature,
      standardApportionment: v.standardApportionment,
      accountId:             v.accountId,
      // CF-06: vínculos opcionais de rateio (Centro de custo / Projeto / Atividade)
      rateioCostCenterId:    v.rateioCostCenterId,
      rateioProjectId:       v.rateioProjectId,
      rateioActivityId:      v.rateioActivityId,

      addresses: this.buildAddresses(v),

      bankData,
      contacts,

      riskClassification: {
        privacyEvaluated:         v.privacyEvaluated         ?? false,
        privacyEvalDate:          this.toIso(v.privacyEvalDate),
        privacyRisk:              v.privacyRisk              ?? '',
        privacyObservations:      v.privacyObservations      ?? '',
        complianceKypInitialDate: this.toIso(v.complianceKypInitialDate),
        complianceKypFinalDate:   this.toIso(v.complianceKypFinalDate),
        complianceRisk:           v.complianceRisk           ?? '',
        complianceObservations:   v.complianceObservations   ?? '',
      },

      // FORN-fix: o cadastro do fornecedor volta a gravar seus impostos/alíquotas
      // (a persistência que a tester pediu). A tela de Tributos permanece independente:
      // só lista prestadores com serviço vinculado (ver tax-service.findAll), então o
      // fornecedor com apenas alíquotas persiste aqui sem "ir para" a tela de Tributos.
      taxesAndServices: {
        serviceClassCode: v.serviceClassCode ?? '',
        serviceTitle:     v.serviceTitle     ?? '',
        operationNature:  v.operationNature  ?? '',
        totalRetentions:  Number(v.totalRetentions) || 0,
        irfAliquot:       Number(v.irfAliquot)    || 0, irfCode:    v.irfCode    ?? '',
        pisAliquot:       Number(v.pisAliquot)    || 0, pisCode:    v.pisCode    ?? '',
        pccAliquot:       Number(v.pccAliquot)    || 0, pccCode:    v.pccCode    ?? '',
        cofinsAliquot:    Number(v.cofinsAliquot) || 0, cofinsCode: v.cofinsCode ?? '',
        inssAliquot:      Number(v.inssAliquot)   || 0,
        csllAliquot:      Number(v.csllAliquot)   || 0,
        ibsAliquot:       Number(v.ibsAliquot)    || 0,
        cbsAliquot:       Number(v.cbsAliquot)    || 0,
        services:         this.services,
      },
    };

    // B-13: omitir accountId quando não há conta contábil (evita FK inválida/500 no back).
    if (!payload.accountId) delete payload.accountId;
    // CF-06: omitir vínculos de rateio vazios (opcionais — 0 = "Selecione").
    if (!payload.rateioCostCenterId) delete payload.rateioCostCenterId;
    if (!payload.rateioProjectId)    delete payload.rateioProjectId;
    if (!payload.rateioActivityId)   delete payload.rateioActivityId;

    this.saved.emit({ id: this.stakeholder.id, payload });
  }
}

/** Achata a árvore do plano de contas (todas as contas, em ordem hierárquica). */
function flattenTree(nodes: AccountPlanOption[]): AccountPlanOption[] {
  const out: AccountPlanOption[] = [];
  const walk = (list: AccountPlanOption[]) => {
    for (const n of list) {
      out.push({ id: n.id, code: n.code, title: n.title, accountType: n.accountType });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}