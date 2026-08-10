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