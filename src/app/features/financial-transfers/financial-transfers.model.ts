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