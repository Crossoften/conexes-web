// src/app/features/bank-accounts/bank-accounts.mock.ts
import { BankAccount, Bank } from './bank-accounts.model';

export const BANK_ACCOUNTS_MOCK: BankAccount[] = Array.from({ length: 25 }, (_, i) => ({
  id: `bank-acc-${i + 1}`,
  code: '0000',
  alias: 'Exemplo',
  agency: '0111',
  accountNumber: '0000000-0',
  accountType: i % 2 === 0 ? 'Caixinha' : 'Conta Corrente',
  initialBalance: '0,00',
  openingDate: '00/00/0000',
  closingDate: i === 4 ? 'Encerramento: 00/00/0000' : undefined,
  bankName: i % 3 === 0 ? 'Caixa Economica' : 'Banco do Brasil',
  status: 'ACTIVE',
}));

export const BANKS_MOCK: Bank[] = Array.from({ length: 15 }, (_, i) => ({
  id: `bank-${i + 1}`,
  code: '0000',
  name: i % 2 === 0 ? 'Banco do Brasil' : 'Caixa Economica',
  status: 'ACTIVE',
  type: 'Exemplo',
}));