// src/app/features/accounts-payable/accounts-payable.mock.ts
import { PayableAccount, SummaryCard } from './accounts-payable.model';

export const PAYABLE_SUMMARIES_MOCK: SummaryCard[] = [
  { isAccountInfo: true, title: 'Dados da conta', bankName: 'Banco do Brasil', agency: '000000', account: '0000', balance: '00000' },
  { title: 'Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Não Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Extrato Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Extrato Conciliado', credit: 'R$ 0', debit: 'R$ 0' }
];

export const ACCOUNTS_PAYABLE_MOCK: PayableAccount[] = Array.from({ length: 25 }, (_, i) => ({
  id: `acc-pay-${i + 1}`,
  displayId: '000',
  type: 'Exemplo',
  document: 'Exemplo',
  company: 'Exemplo',
  history: 'Exemplo',
  registrationDate: '00/00/0000',
  issueDate: 'Exemplo',
  dueDate: 'Exemplo',
  value: 'Exemplo',
  status: 'Exemplo'
}));