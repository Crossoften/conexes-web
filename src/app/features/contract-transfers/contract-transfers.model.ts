// src/app/features/contract-transfers/contract-transfers.model.ts
export type ContractStatus = 'ACTIVE' | 'INACTIVE';
export type ContractType = 'TYPE_A' | 'TYPE_B';

export interface ContractTransfer {
  id: string;
  displayId: string;
  client: string;
  contractName: string;
  contractCode: string;
  description: string;
  approvedValue: string;
  receivedValue: string;
  balance: string;
  status: ContractStatus;
  type: ContractType;
  children?: any[]; // Propriedade para suportar a expansão de linha
}