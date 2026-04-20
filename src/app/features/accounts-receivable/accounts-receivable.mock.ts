// src/app/features/accounts-receivable/accounts-receivable.mock.ts
import { ReceivableAccount, SummaryCard } from './accounts-receivable.model';

export const RECEIVABLE_SUMMARIES_MOCK: SummaryCard[] = [
  { isAccountInfo: true, title: 'Dados da conta', bankName: 'Banco do Brasil', agency: '000000', account: '0000', balance: '00000' },
  { title: 'Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Não Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Extrato Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Extrato Conciliado', credit: 'R$ 0', debit: 'R$ 0' }
];

export const ACCOUNTS_RECEIVABLE_MOCK: ReceivableAccount[] = Array.from({ length: 25 }, (_, i) => ({
  id: `acc-rec-${i + 1}`,
  code: '000000000',
  contractorDoc: '000000000',
  contractorName: 'Exemplo',
  issueDate: '00/00/0000',
  invoiceNumber: 'Exemplo',
  status: 'Exemplo'
}));