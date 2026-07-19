// src/app/features/stakeholders/stakeholders.mapper.ts
import {
  StakeholderPayload,
  StakeholderAddress,
  StakeholderBankData,
  StakeholderContact,
  StakeholderType,
  AccountType,
  PixType,
  PaymentMethod,
  CLIENT_TYPES,
} from './stakeholders.model';

// ── Enums válidos do back ─────────────────────────────────────────────────────

const VALID_TYPES: StakeholderType[] = [
  'Supplier', 'Customer', 'Donor', 'SupportedProject', 'Other',
];

const VALID_ACCOUNT_TYPES: AccountType[] = [
  'Checking', 'Savings', 'Salary', 'Payment',
];

const VALID_PIX_TYPES: PixType[] = [
  'CPF', 'CNPJ', 'Email', 'Phone', 'RandomKey',
];

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'EletronicTransferSameOwner', 'EletronicTransferOtherOwner',
  'TEDSameOwner', 'TEDOtherOwner',
  'DOCSameOwner', 'DOCOtherOwner',
  'BoletoSameBank', 'BoletoOtherBank',
  'UtilityBill', 'DARFWithBarcode', 'GARE', 'SP_ICMS',
  'GNRE_StateTaxes', 'GPS', 'FGTS', 'IPVA', 'DPVAT',
  'DARFWithoutBarcode', 'IPTU', 'INSS_MunicipalTaxes', 'PIX',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retorna o valor só se for um enum válido, senão retorna o fallback */
function validEnum<T extends string>(value: string, valid: T[], fallback: T): T {
  return valid.includes(value as T) ? (value as T) : fallback;
}

/** Converte string para ISO 8601 ou null se vazia/inválida */
function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Endereço como bloco completo: o back exige zipCode, street, number, district,
 * city e state. Só enviamos o endereço quando TODOS estiverem preenchidos —
 * nunca gravamos "N/A". Se o bloco estiver incompleto, não enviamos endereço
 * (a validação de completude fica na página, para avisar o usuário).
 */
function buildAddress(s1: any): StakeholderAddress[] {
  const zipCode  = s1.zipCode?.trim()    ?? '';
  const street   = s1.address?.trim()    ?? '';
  const number   = s1.addressNum?.trim() ?? '';
  const district = s1.district?.trim()   ?? '';
  const city     = s1.city?.trim()       ?? '';
  const state    = s1.state?.trim()      ?? '';

  const complete = !!(zipCode && street && number && district && city && state);
  if (!complete) return [];

  return [{
    zipCode,
    street,
    number,
    complement: s1.complement?.trim() ?? '',
    district,
    city,
    state,
    isBilling: false,
  }];
}

/**
 * FE-S6: endereço de faturamento (só clientes). Mesmo critério de bloco completo;
 * marcado com isBilling=true. Só entra quando o tipo é cliente e o bloco está completo.
 */
function buildBillingAddress(s1: any, type: StakeholderType): StakeholderAddress[] {
  if (!CLIENT_TYPES.includes(type)) return [];

  const zipCode  = s1.billingZipCode?.trim()    ?? '';
  const street   = s1.billingAddress?.trim()    ?? '';
  const number   = s1.billingNum?.trim()        ?? '';
  const district = s1.billingDistrict?.trim()   ?? '';
  const city     = s1.billingCity?.trim()       ?? '';
  const state    = s1.billingState?.trim()      ?? '';

  const complete = !!(zipCode && street && number && district && city && state);
  if (!complete) return [];

  return [{
    zipCode,
    street,
    number,
    complement: s1.billingComplement?.trim() ?? '',
    district,
    city,
    state,
    isBilling: true,
  }];
}

/**
 * Dados bancários como bloco completo: o back exige accountName, accountDocument,
 * bank, agency, account, accountType e paymentMethod. Só enviamos quando o conjunto
 * obrigatório estiver preenchido (accountType/paymentMethod têm default válido).
 * Bloco incompleto → não enviamos (a página valida e avisa o usuário).
 */
function buildBankData(s1: any): StakeholderBankData[] {
  const accountName = s1.differentHolder
    ? (s1.holderName?.trim()     ?? '')
    : (s1.name?.trim()           ?? '');
  const accountDocument = s1.differentHolder
    ? (s1.holderDocument?.trim() ?? '')
    : (s1.document?.trim()       ?? '');
  const bank    = s1.bank?.trim()    ?? '';
  const agency  = s1.agency?.trim()  ?? '';
  const account = s1.account?.trim() ?? '';

  const complete = !!(accountName && accountDocument && bank && agency && account);
  if (!complete) return [];

  return [{
    accountName,
    accountDocument,
    bank,
    agency,
    agencyDigit:  s1.agencyDigit?.trim() ?? '',
    account,
    accountDigit: s1.accountDigit?.trim() ?? '',
    accountType:  validEnum(s1.accountType,           VALID_ACCOUNT_TYPES,   'Checking'),
    pixType:      validEnum(s1.pixType,               VALID_PIX_TYPES,       'CPF'),
    pixKey:       s1.pixKey?.trim() ?? '',
    paymentMethod: validEnum(s1.defaultPaymentMethod, VALID_PAYMENT_METHODS, 'EletronicTransferSameOwner'),
  }];
}

/** Só inclui contato se name estiver preenchido (obrigatório pelo back) */
function buildContacts(s3: any): StakeholderContact[] {
  const name = s3.contactName?.trim() ?? '';
  if (!name) return [];

  return [{
    name,
    email:       s3.contactEmail?.trim()  ?? '',
    phone:       s3.contactPhone?.trim()  ?? '',
    cellphone:   s3.contactMobile?.trim() ?? '',
    position:    '',
    observation: s3.observations?.trim()  ?? '',
  }];
}

// ── Mapper principal ──────────────────────────────────────────────────────────

export function mapFormToPayload(formValue: any): StakeholderPayload {
  const s1 = formValue.step1 ?? {};
  const s2 = formValue.step2 ?? {};
  const s3 = formValue.step3 ?? {};

  // type deve ser um enum válido — se o usuário digitou texto livre, usa 'Other'
  const type = validEnum(s1.type, VALID_TYPES, 'Other');

  return {
    code:     s1.code?.trim()     ?? '',
    type,
    personType:            s1.personType     || 'PJ',
    document:              s1.document?.trim()       ?? '',
    name:                  s1.name?.trim()           ?? '',
    tradeName:             s1.tradeName?.trim()      ?? '',
    email:                 s1.email?.trim()          ?? '',
    phone:                 s1.phone?.trim()           ?? '',
    status:                'Active',
    stateRegistration:     s1.stateReg?.trim()       ?? '',
    municipalRegistration: s1.cityReg?.trim()        ?? '',
    mainActivity:          s1.mainActivity?.trim()   ?? '',
    secondaryActivity:     s1.secondActivity?.trim() ?? '',
    legalNature:           s1.legalNature?.trim()    ?? '',
    standardApportionment: s1.apportionDefault?.trim() ?? '',
    accountId: s1.accountingAccount ? Number(s1.accountingAccount) : 0,

    addresses: [...buildAddress(s1), ...buildBillingAddress(s1, type)],
    bankData:  buildBankData(s1),

    riskClassification: {
      privacyEvaluated:         s2.privacyEvaluated === 'Sim',
      privacyEvalDate:          toIsoOrNull(s2.privacyDate),
      privacyRisk:              s2.supplierRisk?.trim()           ?? '',
      privacyObservations:      s2.privacyObservations?.trim()   ?? '',
      complianceKypInitialDate: toIsoOrNull(s2.kypStartDate1),
      complianceKypFinalDate:   toIsoOrNull(s2.kypEndDate1),
      complianceRisk:           s2.riskEvaluation?.trim()        ?? '',
      complianceObservations:   s2.complianceObservations?.trim() ?? '',
    },

    contacts: buildContacts(s3),

    taxesAndServices: {
      serviceClassCode:    s3.serviceClassCode?.trim()  ?? '',
      serviceTitle:        s3.serviceTitle?.trim()       ?? '',
      operationNature:     s3.searchNatureOp?.trim()     ?? '',
      totalRetentions:     Number(s3.totalRetentions)   || 0,
      irfAliquot:          Number(s3.aliqIRRF)          || 0,
      irfCode:             s3.codIRRF?.trim()            ?? '',
      pisAliquot:          Number(s3.aliqPIS)            || 0,
      pisCode:             s3.codPIS?.trim()              ?? '',
      pccAliquot:          Number(s3.aliqPCC)            || 0,
      pccCode:             s3.codPCC?.trim()              ?? '',
      cofinsAliquot:       Number(s3.aliqCOFINS)         || 0,
      cofinsCode:          s3.codCOFINS?.trim()           ?? '',
      inssAliquot:         Number(s3.aliqINSS)           || 0,
      csllAliquot:         Number(s3.aliqCSLL)           || 0,
      ibsAliquot:          Number(s3.aliqIBS)            || 0,
      cbsAliquot:          Number(s3.aliqCBS)            || 0,
      serviceName:         s3.serviceName?.trim()        ?? '',
      serviceDescription:  s3.serviceDesc?.trim()        ?? '',
      serviceExternalCode: s3.serviceExtCode?.trim()     ?? '',
      serviceGrantorOrgan: s3.serviceGrantor?.trim()     ?? '',
      serviceHasRetention: !!s3.serviceRedemption,
      serviceAccessorOrgan: s3.serviceLinked?.trim()     ?? '',
    },
  };
}
