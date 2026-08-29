// src/app/features/stakeholders/new/stakeholder-new.form.ts
import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { StakeholderService } from '../stakeholders.model';

export function buildStakeholderForm() {
  const fb = inject(FormBuilder);

  // ── Etapa 1 ────────────────────────────────────────────────
  const step1 = fb.group({

    // Obrigatórios (os únicos 3 que travam a navegação)
    personType: ['', Validators.required],
    document:   ['', Validators.required],
    name:       ['', Validators.required],

    // Tipo é obrigatório no contrato (CreateStakeholderDto.required inclui "type")
    type:        ['', Validators.required],

    // Subtipo do fornecedor (pedido do cliente 09/07): Product/Service/Both. Só aplicável quando type=Supplier.
    supplierType: [''],

    // Opcionais
    zipCode:     [''],
    address:     [''],
    addressNum:  [''],
    complement:  [''],
    district:    [''],
    city:        [''],
    state:       [''],

    // FE-S6: endereço de faturamento (exclusivo de clientes)
    billingZipCode:    [''],
    billingAddress:    [''],
    billingNum:        [''],
    billingComplement: [''],
    billingDistrict:   [''],
    billingCity:       [''],
    billingState:      [''],

    phone:       [''],
    mobile:      [''],
    email:       [''],
    stateReg:    [''],
    cityReg:     [''],
    mainActivity:    [''],
    secondActivity:  [''],
    legalNature:     [''],

    // Sub-aba: Dados de rateio
    apportionDefault:  [''],
    accountingAccount: [''],

    // CF-06: vínculos opcionais de rateio (Centro de custo / Projeto / Atividade)
    rateioCostCenter:  [''],
    rateioProject:     [''],
    rateioActivity:    [''],

    // Sub-aba: Dados bancários
    differentHolder:      [false],
    holderPerson:         [''],
    holderName:           [''],
    holderDocument:       [''],
    bank:                 [''],
    agency:               [''],
    agencyDigit:          [''],
    account:              [''],
    accountDigit:         [''],
    accountType:          [''],
    pixType:              [''],
    pixKey:               [''],
    defaultPaymentMethod: ['EletronicTransferSameOwner'],
  });

  // ── Etapa 2 — tudo opcional para navegação ─────────────────
  const step2 = fb.group({
    privacyEvaluated:       ['Não'],
    privacyDate:            [''],
    supplierRisk:           ['Sem risco'],
    privacyObservations:    [''],
    kypStartDate1:          [''],
    kypEndDate1:            [''],
    kypStartDate2:          [''],
    kypEndDate2:            [''],
    riskEvaluation:         [''],
    complianceObservations: [''],
  });

  // ── Etapa 3 — tudo opcional para navegação ─────────────────
  const step3 = fb.group({
    contactName:      [''],
    contactPhone:     [''],
    contactMobile:    [''],
    contactEmail:     [''],
    observations:     [''],
    serviceClassCode: [''],
    serviceTitle:     [''],
    searchNatureOp:   [''],
    manualAliquots:   [false],
    totalRetentions:  [''],
    aliqIRRF:   [''], codIRRF:   [''],
    aliqPIS:    [''], codPIS:    [''],
    aliqPCC:    [''], codPCC:    [''],
    aliqCOFINS: [''], codCOFINS: [''],
    aliqINSS:   [''], codINSS:   [''],
    aliqCSLL:   [''], codCSLL:   [''],
    aliqISS:    [''], codISS:    [''],
    aliqIBS:    [''], codIBS:    [''],
    aliqCBS:    [''], codCBS:    [''],
    // Campos de "novo serviço" (draft) + a lista de serviços adicionados (5.2).
    serviceName:       [''],
    serviceDesc:       [''],
    serviceExtCode:    [''],
    serviceGrantor:    [''],
    serviceRedemption: [false],
    serviceLinked:     [''],
    services:          [[] as StakeholderService[]],
  });

  return fb.group({ step1, step2, step3 });
}

export type StakeholderForm = ReturnType<typeof buildStakeholderForm>;
