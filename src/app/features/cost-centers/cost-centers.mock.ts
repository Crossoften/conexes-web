// src/app/features/cost-centers/cost-centers.mock.ts
import { CostCenter } from './cost-centers.model';

export const COST_CENTERS_MOCK: CostCenter[] = [
  {
    id: '1', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
    groups: [
      {
        id: 'g1', code: '1.1.02', title: 'PROJETO TRANSFORMANDO VIDAS',
        children: [
          { id: 'g1-1', code: '1.1.02.01', title: 'Curso de Corte e Costura',        description: 'Descrição atividade', status: 'ACTIVE' },
          { id: 'g1-2', code: '1.1.02.02', title: 'Curso de Auxiliar Administrativo', description: 'Descrição atividade', status: 'ACTIVE' },
          { id: 'g1-3', code: '1.1.02.03', title: 'Curso de Unha',                   description: 'Descrição atividade', status: 'ACTIVE' },
        ],
      },
    ],
  },
  {
    id: '2', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '3', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '4', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '5', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'INACTIVE',
  },
  {
    id: '6', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'INACTIVE',
  },
  {
    id: '7', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'INACTIVE',
  },
  {
    id: '8', number: '000000000', title: 'IGEP Gestão estratégica', type: 'T',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '9', number: '000000000', title: 'IGEP Gestão estratégica', type: 'A',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
  {
    id: '10', number: '000000000', title: 'IGEP Gestão estratégica', type: 'A',
    budgetMgmt: 'Ativo', description: 'IGEP Gestão estratégica', status: 'ACTIVE',
  },
];
