// src/app/features/stakeholders/components/stakeholder-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Stakeholder,
  StakeholderPayload,
  STAKEHOLDER_STATUS_CONFIG,
  STAKEHOLDER_TYPE_LABELS,
} from '../stakeholders.model';

type ModalTab = 'GERAIS' | 'RISCO' | 'OBSERVACOES';

@Component({
  selector: 'app-stakeholder-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './stakeholder-detail.modal.html',
  styleUrl: './stakeholder-detail.modal.scss',
})
export class StakeholderDetailModalComponent implements OnChanges {
  @Input() stakeholder: Stakeholder | null = null;

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<{ id: number; payload: Partial<StakeholderPayload> }>();

  private readonly fb = inject(NonNullableFormBuilder);

  mode: 'view' | 'edit' = 'view';
  activeTab: ModalTab   = 'GERAIS';
  bankError: string | null = null;

  readonly statusConfig = STAKEHOLDER_STATUS_CONFIG;
  readonly typeLabels   = STAKEHOLDER_TYPE_LABELS;

  // ── Formulário ────────────────────────────────────────────────────────────

  readonly form = this.fb.group({
    // Aba GERAIS
    code:                  [{ value: '', disabled: true }],
    type:                  [''],
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
      serviceName:          tax?.serviceName          ?? '',
      serviceDescription:   tax?.serviceDescription   ?? '',
      serviceExternalCode:  tax?.serviceExternalCode  ?? '',
      serviceGrantorOrgan:  tax?.serviceGrantorOrgan  ?? '',
      serviceHasRetention:  tax?.serviceHasRetention  ?? false,
      serviceAccessorOrgan: tax?.serviceAccessorOrgan ?? '',
    });
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

  get primaryAddress() {
    return this.stakeholder?.addresses?.find(a => !a.isBilling) ?? this.stakeholder?.addresses?.[0] ?? null;
  }

  /** FE-S6: clientes (Customer/Donor/SupportedProject) têm endereço de faturamento. */
  get isClient(): boolean {
    return ['Customer', 'Donor', 'SupportedProject'].includes(this.form.getRawValue().type as string);
  }

  /** FE-S6: endereço principal (sem isBilling) + faturamento (isBilling=true) quando cliente e completo. */
  private buildAddresses(v: any) {
    // B-13: não enviar isBilling no endereço principal — só o de faturamento leva a flag.
    const main = {
      zipCode:    v.addrZipCode    ?? '',
      street:     v.addrStreet     ?? '',
      number:     v.addrNumber     ?? '',
      complement: v.addrComplement ?? '',
      district:   v.addrDistrict   ?? '',
      city:       v.addrCity       ?? '',
      state:      v.addrState      ?? '',
    };
    const billComplete = !!(v.billZipCode && v.billStreet && v.billNumber && v.billDistrict && v.billCity && v.billState);
    if (this.isClient && billComplete) {
      return [main, {
        zipCode:    v.billZipCode,
        street:     v.billStreet,
        number:     v.billNumber,
        complement: v.billComplement ?? '',
        district:   v.billDistrict,
        city:       v.billCity,
        state:      v.billState,
        isBilling:  true,
      }];
    }
    return [main];
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

      taxesAndServices: {
        serviceClassCode:     v.serviceClassCode     ?? '',
        serviceTitle:         v.serviceTitle         ?? '',
        operationNature:      v.operationNature      ?? '',
        totalRetentions:      v.totalRetentions      ?? 0,
        irfAliquot:           v.irfAliquot           ?? 0,
        irfCode:              v.irfCode              ?? '',
        pisAliquot:           v.pisAliquot           ?? 0,
        pisCode:              v.pisCode              ?? '',
        pccAliquot:           v.pccAliquot           ?? 0,
        pccCode:              v.pccCode              ?? '',
        cofinsAliquot:        v.cofinsAliquot        ?? 0,
        cofinsCode:           v.cofinsCode           ?? '',
        inssAliquot:          v.inssAliquot          ?? 0,
        csllAliquot:          v.csllAliquot          ?? 0,
        ibsAliquot:           v.ibsAliquot           ?? 0,
        cbsAliquot:           v.cbsAliquot           ?? 0,
        serviceName:          v.serviceName          ?? '',
        serviceDescription:   v.serviceDescription   ?? '',
        serviceExternalCode:  v.serviceExternalCode  ?? '',
        serviceGrantorOrgan:  v.serviceGrantorOrgan  ?? '',
        serviceHasRetention:  v.serviceHasRetention  ?? false,
        serviceAccessorOrgan: v.serviceAccessorOrgan ?? '',
      },
    };

    // B-13: omitir accountId quando não há conta contábil (evita FK inválida/500 no back).
    if (!payload.accountId) delete payload.accountId;

    this.saved.emit({ id: this.stakeholder.id, payload });
  }
}