// src/app/features/contract-transfers/contract-transfers.mock.ts
import { ContractTransfer } from './contract-transfers.model';

export const CONTRACT_TRANSFERS_MOCK: ContractTransfer[] = Array.from({ length: 25 }, (_, i) => ({
  id: `ct-${i + 1}`,
  displayId: '000',
  client: 'Exemplo nome',
  contractName: 'Exemplo nome',
  contractCode: 'Exemplo nome',
  description: 'Exemplo nome',
  approvedValue: 'Exemplo nome',
  receivedValue: 'Exemplo nome',
  balance: 'Exemplo nome',
  status: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
  type: i % 3 === 0 ? 'TYPE_A' : 'TYPE_B',
  children: i % 2 === 0 ? [{ id: 'child-1' }] : [], // Simula que algumas linhas têm filhos para expandir
}));