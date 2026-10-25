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
  // TR-04 (duplicar): valores crus para pré-preencher o formulário.
  originAccountId?: number;
  destinationAccountId?: number;
  rawAmount?: number;
  rawDate?: string;
  observation?: string;
}

// ── FIN-001: cadastro de transferência (POST /v1/banking/transfers) ───────────
export interface BankAccountOption {
  id:    number;
  label: string;
}

/** LB-05 / TR-RATEIO: uma linha de rateio por classificação. */
export interface BankMovementRateio {
  accountPlanId?: number;
  projectId?:     number;
  costCenterId?:  number;
  activityId?:    number;   // LB-05 / I052: atividade por linha de rateio
  percentage?:    number;
  amount?:        number;
}

export interface CreateBankTransferPayload {
  description:          string;
  originAccountId:      number;
  destinationAccountId: number;
  operationDate:        string;   // ISO 8601
  amount:              number;
  differentCreditDate?: boolean;
  observation?:        string;
  // TR-07: data em que o destino é creditado, quando diferente da operação.
  creditDate?:               string;
  // TR-09: natureza do recurso de cada ponta (Publico | Privado).
  originResourceNature?:      string;
  destinationResourceNature?: string;
  // TR-08: 'auto' compõe a descrição a partir das contas; 'manual' usa a digitada.
  descriptionMode?:          'auto' | 'manual';
  // TR-RATEIO
  rateios?:                  BankMovementRateio[];
}

// ── Lançamento avulso (POST /v1/banking/entries) ──────────────────────────────
export type BankEntryType = 'Credit' | 'Debit';

export interface CreateBankEntryPayload {
  bankAccountId: number;
  description:   string;
  amount:        number;
  type:          BankEntryType;   // Crédito (entrada) / Débito (saída)
  category?:     string;
  date:          string;          // ISO 8601
  observation?:  string;
  stakeholderId?: number;         // LB-12: fornecedor (opcional)
  accountPlanId?: number;         // LB-04: conta do plano de contas
  rateios?:       BankMovementRateio[];  // LB-05
}

/** TR-09: mesmo vocabulário do cadastro de conta bancária. */
/**
 * TR-09: as QUATRO naturezas que o critério nomeia.
 *
 * O reteste 19/10 (pág. 3) é literal: "com as opções recurso próprio, recurso
 * municipal, recurso federal e recurso estadual". Eu havia usado Público/Privado
 * — o vocabulário do cadastro de conta bancária —, que é outra classificação e
 * não responde ao pedido: um recurso federal e um municipal são ambos públicos,
 * e é exatamente a distinção entre eles que a prestação de contas exige.
 */
export const NATUREZAS_RECURSO = [
  { valor: 'Proprio',   rotulo: 'Recurso próprio' },
  { valor: 'Municipal', rotulo: 'Recurso municipal' },
  { valor: 'Estadual',  rotulo: 'Recurso estadual' },
  { valor: 'Federal',   rotulo: 'Recurso federal' },
];
// ── TR-14/LB-10: lotes de importação ─────────────────────────────────────────

/**
 * Um lote de importação por planilha. Existe para que uma importação errada
 * possa ser desfeita inteira — antes, planilha errada só saía apagando registro
 * a registro.
 */
export interface ImportBatch {
  id: number;
  /** 'transfers' | 'entries' */
  kind: string;
  fileName: string;
  total: number;
  success: number;
  failed: number;
  /** Quantos registros do lote AINDA existem: o usuário pode ter apagado alguns
   *  à mão depois de importar, e aí o número do resumo mentiria. */
  restantes: number;
  errorList: string[];
  user?: { id: number; name: string } | null;
  createdAt: string;
}

export interface ImportBatchListResult { items: ImportBatch[]; total: number }
