// src/app/features/integrations/integrations.model.ts

// ── NFe.io (Onda B) ──────────────────────────────────────────────────────────
export type FiscalDocType = 'NFE_PRODUTO' | 'NFSE_SERVICO' | 'NFE_INBOUND' | 'NFSE_INBOUND';
export type FiscalDirection = 'OUTBOUND' | 'INBOUND';
export type FiscalStatus = 'Pending' | 'Processing' | 'Issued' | 'Failed' | 'Cancelled' | 'Received';

export interface FiscalDocument {
  id:            number;
  type:          FiscalDocType;
  direction:     FiscalDirection;
  status:        FiscalStatus;
  provider:      string;
  providerId?:   string | null;
  externalId?:   string | null;
  accessKey?:    string | null;
  number?:       string | null;
  series?:       string | null;
  amount?:       number | null;
  issuerName?:   string | null;
  issuerCnpj?:   string | null;
  recipientName?: string | null;
  recipientCnpj?: string | null;
  xmlUrl?:       string | null;
  pdfUrl?:       string | null;
  error?:        string | null;
  createdAt?:    string;
}

export interface FiscalDocumentList {
  data:  FiscalDocument[];
  count: number;
}

export interface EmitServiceInvoicePayload {
  externalId:        string;
  description:       string;
  servicesAmount:    number;
  cityServiceCode:   string;
  federalServiceCode?: string;
  borrower?: {
    type?: 'NaturalPerson' | 'LegalEntity';
    name?: string;
    federalTaxNumber?: string;
    email?: string;
  };
  nbsCode?: string;
  ibsCbs?: { operationIndicator: string; classCode: string; purpose?: string };
}

// ── TecnoSpeed / PlugBank (Onda C) ──────────────────────────────────────────
export type BankPaymentMethod = 'PIX' | 'BOLETO' | 'TED' | 'TRANSFER';
export type BankPaymentStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled' | 'Scheduled';

export interface BankPaymentOrder {
  id:             number;
  provider:       string;
  bankAccountId?: number | null;
  method:         BankPaymentMethod;
  status:         BankPaymentStatus;
  amount:         number;
  payeeName?:     string | null;
  payeeDocument?: string | null;
  payeeKeyOrLine?: string | null;
  description?:   string | null;
  scheduledDate?: string | null;
  paidDate?:      string | null;
  providerId?:    string | null;
  error?:         string | null;
  createdAt?:     string;
}

export interface CreatePaymentPayload {
  bankAccountId?:   number;
  method:           BankPaymentMethod;
  amount:           number;
  payeeName?:       string;
  payeeDocument?:   string;
  payeeKeyOrLine?:  string;
  description?:     string;
  scheduledDate?:   string;
}

export type ConsentStatus = 'Pending' | 'Authorized' | 'Rejected' | 'Expired' | 'Revoked';

export interface OpenFinanceAccount {
  id:                number;
  provider:          string;
  bankAccountId?:    number | null;
  externalAccountId?: string | null;
  consentStatus:     ConsentStatus;
  isActive:          boolean;
  lastSyncAt?:       string | null;
}

export interface IntegrationStatus {
  extrato:    boolean;
  pagamentos: boolean;
}
