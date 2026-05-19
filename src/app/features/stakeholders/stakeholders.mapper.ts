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

/** Só inclui endereço se os campos obrigatórios estiverem preenchidos */
function buildAddress(s1: any): StakeholderAddress[] {
  // address = street, district/city/state são obrigatórios pelo back
  const street   = s1.address?.trim()   ?? '';
  const district = s1.district?.trim()  ?? '';
  const city     = s1.city?.trim()      ?? '';
  const state    = s1.state?.trim()     ?? '';

  // Se não tiver pelo menos rua preenchida, não envia endereço
  if (!street) return [];

  return [{
    zipCode:    s1.zipCode?.trim()    ?? '',
    street,
    number:     s1.addressNum?.trim() ?? '',
    complement: s1.complement?.trim() ?? '',
    district:   district || 'N/A',   // fallback para não rejeitar
    city:       city     || 'N/A',
    state:      state    || 'N/A',
  }];
}

/** Só inclui dados bancários se bank E account estiverem preenchidos */
function buildBankData(s1: any): StakeholderBankData[] {
  const bank    = s1.bank?.trim()    ?? '';
  const account = s1.account?.trim() ?? '';

  if (!bank || !account) return [];

  return [{
    accountName:     s1.differentHolder
      ? (s1.holderName?.trim()     ?? '')
      : (s1.name?.trim()           ?? ''),
    accountDocument: s1.differentHolder
      ? (s1.holderDocument?.trim() ?? '')
      : (s1.document?.trim()       ?? ''),
    bank,
    agency:       s1.agency?.trim()      ?? '',
    agencyDigit:  s1.agencyDigit?.trim() ?? '',
    account,
    accountDigit: s1.accountDigit?.trim() ?? '',
    accountType:  validEnum(s1.accountType,        VALID_ACCOUNT_TYPES,  'Checking'),
    pixType:      validEnum(s1.pixType,             VALID_PIX_TYPES,      'CPF'),
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

  return {
    code:     s1.code?.trim()     ?? '',
    // type deve ser um enum válido — se o usuário digitou texto livre, usa 'Other'
    type:     validEnum(s1.type, VALID_TYPES, 'Other'),
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

    addresses: buildAddress(s1),
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
