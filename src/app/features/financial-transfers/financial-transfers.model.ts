// src/app/features/financial-transfers/financial-transfers.model.ts
export type TransferStatus = 'COMPLETED' | 'PENDING';
export type TransferType = 'PIX' | 'TED';
export type TransferView = 'TRANSFERS' | 'ENTRIES';

export interface FinancialTransfer {
  id: string;
  code: string;
  description: string;
  origin: string;
  destination: string;
  operationDate: string;
  value: string;
  status: TransferStatus;
  type: TransferType;
  // TR-04 (duplicar): valores crus para pré-preencher o formulário.
  originAccountId?: number;
  destinationAccountId?: number;
  rawAmount?: number;
  rawDate?: string;
  observation?: string;
}

// ── FIN-001: cadastro de transferência (POST /v1/banking/transfers) ───────────
export interface BankAccountOption {
  id:    number;
  label: string;
}

export interface CreateBankTransferPayload {
  description:          string;
  originAccountId:      number;
  destinationAccountId: number;
  operationDate:        string;   // ISO 8601
  amount:              number;
  differentCreditDate?: boolean;
  observation?:        string;
}

// ── Lançamento avulso (POST /v1/banking/entries) ──────────────────────────────
export type BankEntryType = 'Credit' | 'Debit';

export interface CreateBankEntryPayload {
  bankAccountId: number;
  description:   string;
  amount:        number;
  type:          BankEntryType;   // Crédito (entrada) / Débito (saída)
  category?:     string;
  date:          string;          // ISO 8601
  observation?:  string;
  stakeholderId?: number;         // LB-12: fornecedor (opcional)
}