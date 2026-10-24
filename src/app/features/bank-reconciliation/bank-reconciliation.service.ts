// src/app/features/bank-reconciliation/bank-reconciliation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReconAccount {
  id: number; name: string; agency: string; account: string;
  balance: number; conciliated: number; pending: number; pendingCount: number;
}
/**
 * CB-03 / I060: a pendência passou a trazer os dados da própria movimentação —
 * antes vinham só id/data/valor e a tela exibia um texto fixo para toda linha.
 */
export interface ReconPending {
  id: number; date: string; day: number; value: number;
  description?: string | null; category?: string | null; type?: string;
  stakeholderId?: number | null; stakeholder?: string | null;
  costCenterId?: number | null; costCenter?: string | null;
}
/** CB-10 / I066: título de contas a pagar/receber candidato a conciliar com o extrato. */
export interface LedgerCandidate {
  id: number; type: 'payable' | 'receivable'; description: string | null;
  dueDate: string; status: string; value: number; party?: string | null;
}

/** CB-07 / I063: a regra da conciliação automática, para exibir ANTES de executar. */
export interface AutoRule { janelaDias: number; titulo: string; regra: string[]; }
export interface AutoResult extends AutoRule {
  analisados: number;
  mensagem: string;
  conciliados: { id: number; descricao: string; valor: number; vinculo: string; tituloDescricao?: string | null }[];
  naoResolvidos: { id: number; descricao: string; valor?: number; motivo: string; candidatos?: string[] }[];
}

/** CB-09 / I065: lote de importação de extrato e o resultado da importação. */
export interface ImportBatch {
  id: number; kind: string; fileName: string;
  total: number; success: number; failed: number;
  restantes: number; errorList: string[]; createdAt: string;
  user?: { id: number; name: string } | null;
}
export interface StatementImportResult {
  batchId: number | null; total: number; success: number; failed: number;
  arquivo: string; formato: string;
  results: { row: number; status: string; message: string }[];
}
export interface ReconMovement {
  id: number; bankDescription: string; bankValue: number; date: string; type: string;
  reconciled: boolean; conexosDescription: string | null; conexosValue: number | null;
  stakeholder: string | null; costCenter: string | null;
}
export interface AccountReconciliation {
  account: { id: number; name: string; agency: string; account: string; balance: number };
  pendingReconciliations: ReconPending[];
  movements: ReconMovement[];
}

@Injectable({ providedIn: 'root' })
export class BankReconciliationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/banking/reconciliation`;

  /** Lista as contas bancárias com totais de conciliado/pendente (para escolher a conta). */
  getAccounts(): Observable<ReconAccount[]> {
    return this.http.get<ReconAccount[]>(this.base);
  }

  /** Dados de conciliação de uma conta: pendências + movimentações + saldo. */
  getAccountReconciliation(bankAccountId: number): Observable<AccountReconciliation> {
    return this.http.get<AccountReconciliation>(`${this.base}/${bankAccountId}`);
  }

  /** Concilia uma transação bancária a um lançamento (PATCH match). */
  match(transactionId: number, payload: unknown): Observable<unknown> {
    return this.http.patch(`${this.base}/${transactionId}/match`, payload);
  }

  /** CB-13 / I069: ignora a pendência — sai da fila sem ser conciliada. */
  ignore(transactionId: number, ignored = true): Observable<unknown> {
    return this.http.patch(`${this.base}/${transactionId}/ignore`, { ignored });
  }

  /**
   * CB-10 / I066: busca títulos de contas a pagar/receber candidatos à conciliação.
   * A rota já existia no back; a tela nunca a chamava — o campo "Buscar lançamento"
   * do painel da pendência não tinha ligação nenhuma.
   */
  searchEntries(params: { description?: string; value?: number; startDate?: string; endDate?: string }):
    Observable<{ payables: LedgerCandidate[]; receivables: LedgerCandidate[] }> {
    let p = new HttpParams();
    if (params.description) p = p.set('description', params.description);
    if (params.value != null) p = p.set('value', String(params.value));
    if (params.startDate) p = p.set('startDate', params.startDate);
    if (params.endDate) p = p.set('endDate', params.endDate);
    return this.http.get<{ payables: LedgerCandidate[]; receivables: LedgerCandidate[] }>(
      `${this.base}/search-entries`, { params: p },
    );
  }

  /** CB-07 / I063: a regra usada pela conciliação automática, buscada ANTES de executar. */
  autoRule(): Observable<AutoRule> {
    return this.http.get<AutoRule>(`${this.base}/auto-rule`);
  }

  /** CB-07 / I063: executa a conciliação automática e devolve o que casou e o que não casou. */
  autoReconcile(bankAccountId: number): Observable<AutoResult> {
    return this.http.post<AutoResult>(`${this.base}/${bankAccountId}/auto`, {});
  }

  /** CB-09 / I065: importa extrato OFX ou Excel para a conta, em lote. */
  importStatement(bankAccountId: number, file: File): Observable<StatementImportResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<StatementImportResult>(`${this.base}/${bankAccountId}/import-statement`, form);
  }

  /** CB-09 / I065: lotes de extrato importado (infra de lote do TR-14). */
  listStatementBatches(): Observable<{ data: ImportBatch[] }> {
    const p = new HttpParams().set('kind', 'statement').set('take', '20');
    return this.http.get<{ data: ImportBatch[] }>(`${environment.apiUrl}/v1/banking/import-batches`, { params: p });
  }

  /** CB-09 / I065: desfaz o lote — apaga os lançamentos que ainda não foram tocados. */
  undoBatch(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/v1/banking/import-batches/${id}`);
  }

  /**
   * CB-08 / I064: conexões Open Finance cadastradas. A ligação do botão "Importar do
   * banco" precisa descobrir a conexão DESTA conta — o parâmetro accountId do sync é o
   * id da conexão (OpenFinanceAccount), não o da conta bancária; mandar um pelo outro
   * casaria a conexão errada.
   */
  listBankConnections(): Observable<BankConnection[]> {
    return this.http.get<BankConnection[]>(`${environment.apiUrl}/v1/integrations/tecnospeed/connections`);
  }

  /**
   * CB-08 / I064: importa o extrato direto do banco no período escolhido, pela conexão
   * Open Finance. A perna externa (credencial de sandbox bancário) é pendência; sem ela
   * o próprio serviço responde o motivo, que a tela exibe em vez de falhar calada.
   */
  syncFromBank(payload: { accountId?: number; from?: string; to?: string }):
    Observable<{ imported?: number; accounts?: number; message?: string }> {
    return this.http.post<{ imported?: number; accounts?: number; message?: string }>(
      `${environment.apiUrl}/v1/integrations/tecnospeed/statements/sync`, payload,
    );
  }
}

/** CB-08 / I064: conexão Open Finance de uma conta bancária. */
export interface BankConnection {
  id: number; bankAccountId: number | null; externalAccountId: string | null;
  consentStatus: string; isActive: boolean; lastSyncAt: string | null;
}
