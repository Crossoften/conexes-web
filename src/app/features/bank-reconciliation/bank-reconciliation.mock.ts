// src/app/features/bank-reconciliation/bank-reconciliation.mock.ts
import { BankAccountInfo, ConciliationSummary, ReconciliationItem } from './bank-reconciliation.model';

export const ACCOUNT_INFO_MOCK: BankAccountInfo = {
  bankName: 'Banco do Brasil',
  agency: '000000',
  account: '0000',
  balance: '00000'
};

export const SUMMARY_CARDS_MOCK: ConciliationSummary[] = [
  { title: 'Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Não Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Extrato Conciliado', credit: 'R$ 0', debit: 'R$ 0' },
  { title: 'Extrato Conciliado', credit: 'R$ 0', debit: 'R$ 0' }
];

export const RECONCILIATION_ITEMS_MOCK: ReconciliationItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `rec-${i + 1}`,
  date: '00/00/0000',
  dayOfWeek: 'Segunda-feira',
  description: 'Cheque compensado - Data balanço: 00/00',
  amount: '-1.200,00',
  bankDetails: ACCOUNT_INFO_MOCK,
  movementGroups: [
    {
      id: `grp-${i + 1}`,
      groupName: '2 LANÇAMENTOS',
      totalValConexes: '00,00',
      groupDescBank: 'Cheque compensado - Data balanço: 00/00',
      totalValBank: '00,00',
      conciliationType: 'MANUAL',
      subItems: [
        { id: `sub-1-${i}`, descConexes: 'ALUGUEL', valConexes: '00,00', descBank: 'Descrição atividade', valBank: '00,00' },
        { id: `sub-2-${i}`, descConexes: 'ALUGUEL', valConexes: '00,00', descBank: 'Descrição atividade', valBank: '00,00' }
      ]
    }
  ]
}));