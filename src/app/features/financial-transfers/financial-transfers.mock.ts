// src/app/features/financial-transfers/financial-transfers.mock.ts
import { FinancialTransfer } from './financial-transfers.model';

export const TRANSFERS_MOCK: FinancialTransfer[] = Array.from({ length: 25 }, (_, i) => ({
  id: `transf-${i + 1}`,
  code: '000000000',
  description: 'BB RENDE FACIL',
  origin: '41 - SEAP - BB RENDE',
  destination: 'Exemplo',
  operationDate: '00/00/0000',
  value: 'R$00,00',
  status: i % 2 === 0 ? 'COMPLETED' : 'PENDING',
  type: i % 2 === 0 ? 'PIX' : 'TED',
}));