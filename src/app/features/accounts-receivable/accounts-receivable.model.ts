// src/app/features/accounts-receivable/accounts-receivable.model.ts
export interface SummaryCard {
  title: string;
  credit?: string;
  debit?: string;
  balance?: string;
  isAccountInfo?: boolean;
  bankName?: string;
  agency?: string;
  account?: string;
}

export interface ReceivableAccount {
  id: string;
  code: string;
  contractorDoc: string;
  contractorName: string;
  issueDate: string;
  /** CR-01: a coluna de vencimento faltava — a API devolvia e a tela descartava. */
  dueDate: string;
  invoiceNumber: string;
  status: string;
  // FIN-01: baixa (recebimento) parcial
  value: string;
  rawStatus: string;
  balance: string;
  balanceNum: number;
  canReceive: boolean;
  /** E2: quantas parcelas o título já tem, para a tela saber o que oferecer. */
  installmentsCount: number;
  /** CR-01/I091: as parcelas do título, para a visão "Parcelas (uma por vencimento)",
   *  no mesmo padrão de Contas a pagar. */
  installments: ReceivableInstallmentRow[];
}

/** CR-01/I091: uma parcela na visão "Parcelas". */
export interface ReceivableInstallmentRow {
  numero: number;
  dueDate: string;
  value: string;
  paid: string;
  status: string;
}

export interface ReceivableFilters {
  status: string;
  /** CR-01: sobre qual data o intervalo incide (o par de pagar, CP-01). */
  dateField: string;
  /** CR-01: "Período" era um texto livre que nunca chegava ao servidor. */
  dateStart: string;
  dateEnd: string;
  contractor: string;
  /**
   * CR-02/I092: o servidor já filtrava por parceria (partnershipId) e a tela não
   * oferecia o campo — o filtro existia e ninguém conseguia usá-lo.
   */
  partnership: string;
  /**
   * CR-02/I092: filtros equivalentes aos de Contas a pagar. Contrato é vínculo
   * direto; categoria/conta, projeto e centro de custo vêm do rateio do título.
   */
  contract: string;
  accountPlan: string;
  project: string;
  costCenter: string;
}

/** Uma opção de select do filtro. */
export interface FilterOption { value: string; label: string }