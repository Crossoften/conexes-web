// src/app/features/chart-of-accounts/chart-of-accounts.mock.ts
import { Account } from './chart-of-accounts.model';

export const ACCOUNTS_MOCK: Account[] = [
  {
    id: '1', number: '000000001', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
    children: [
      { id: '1-1', title: 'IGEP Gestão estratégica', description: 'Descrição atividade', status: 'ACTIVE' },
      { id: '1-2', title: 'IGEP Gestão estratégica', description: 'Descrição atividade', status: 'ACTIVE' },
    ],
  },
  {
    id: '2', number: '000000002', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
    children: [
      { id: '2-1', title: 'IGEP Gestão estratégica', description: 'Descrição atividade', status: 'ACTIVE' },
    ],
  },
  {
    id: '3', number: '000000003', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '4', number: '000000004', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '5', number: '000000005', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '6', number: '000000006', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '7', number: '000000007', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'INACTIVE',
  },
  {
    id: '8', number: '000000008', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'INACTIVE',
  },
  {
    id: '9', number: '000000009', title: 'IGEP Gestão estratégica', type: 'A',
    budgetMgmt: 'Inativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '10', number: '000000010', title: 'IGEP Gestão estratégica', type: 'A',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
];
