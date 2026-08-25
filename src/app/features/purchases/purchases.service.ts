// src/app/features/purchases/purchases.service.ts
//
// Service único do domínio de Compras — cobre Requisições, Cotações e Contratos
// (tag "Admin - Compras e Requisições" do Swagger). Consumido por
// quotations, purchasing-management e purchasing-dashboard.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RawListEnvelope, toPage } from '../../shared/utils/to-page';
import {
  Page,
  PurchaseRef,
  PurchaseRequest,
  PurchaseRequestListParams,
  PurchaseHistoryParams,
  PurchaseQuotation,
  PurchaseContract,
  PurchaseContractListParams,
  PurchaseFile,
  PurchaseDashboardResponse,
  CreatePurchaseRequestPayload,
  UpdatePurchaseRequestPayload,
  CreateQuotationPayload,
  CreateContractPayload,
  UpdateContractPayload,
  AttachFilePayload,
  SetApproversPayload,
  ChangeBuyerPayload,
  PurchaseRequestActionLog,
  AwardPayload,
  PurchaseOrder,
  PurchaseOrderListParams,
  ApprovalLimit,
} from './purchases.model';

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/purchases`;

  // ── Requisições ─────────────────────────────────────────────────────────────

  getRequests(params: PurchaseRequestListParams = {}): Observable<Page<PurchaseRequest>> {
    let httpParams = new HttpParams();
    if (params.search)             httpParams = httpParams.set('search', params.search);
    if (params.status)             httpParams = httpParams.set('status', params.status);
    if (params.stage != null)      httpParams = httpParams.set('stage', String(params.stage));
    if (params.requesterId != null) httpParams = httpParams.set('requesterId', String(params.requesterId));
    if (params.buyerId != null)    httpParams = httpParams.set('buyerId', String(params.buyerId));
    if (params.skip != null)       httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null)       httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<PurchaseRequest> | PurchaseRequest[]>(`${this.base}/requests`, { params: httpParams })
      .pipe(map(toPage));
  }

  getRequestsByStage(stage: number): Observable<Page<PurchaseRequest>> {
    return this.http
      .get<RawListEnvelope<PurchaseRequest> | PurchaseRequest[]>(`${this.base}/requests/stage/${stage}`)
      .pipe(map(toPage));
  }

  getRequestHistory(params: PurchaseHistoryParams = {}): Observable<Page<PurchaseRequest>> {
    let httpParams = new HttpParams();
    if (params.requesterId != null) httpParams = httpParams.set('requesterId', String(params.requesterId));
    if (params.skip != null)        httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null)        httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<PurchaseRequest> | PurchaseRequest[]>(`${this.base}/requests/history`, { params: httpParams })
      .pipe(map(toPage));
  }

  getRequestById(id: number): Observable<PurchaseRequest> {
    return this.http.get<PurchaseRequest>(`${this.base}/requests/${id}`);
  }

  createRequest(payload: CreatePurchaseRequestPayload): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests`, payload);
  }

  updateRequest(id: number, payload: UpdatePurchaseRequestPayload): Observable<PurchaseRequest> {
    return this.http.patch<PurchaseRequest>(`${this.base}/requests/${id}`, payload);
  }

  deleteRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/requests/${id}`);
  }

  // ── Ações de ciclo da requisição ──────────────────────────────────────────────

  submitRequest(id: number): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/submit`, {});
  }

  approveRequest(id: number): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/approve`, {});
  }

  // BK-C2: o back deriva o ator das ações pelo JWT — os DTOs não aceitam mais
  // `userId` no corpo. O front apenas envia o motivo/payload da ação.
  rejectRequest(id: number, reason?: string): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/reject`, { reason });
  }

  /** FE-6: solicitar ajustes ao requisitante (Etapa 2) → status AwaitingAdjustment. */
  requestChanges(id: number, reason?: string): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/request-changes`, { reason });
  }

  cancelRequest(id: number, reason: string): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/cancel`, { reason });
  }

  restartRequest(id: number, reason?: string): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/restart`, { reason });
  }

  moveRequest(id: number, stage: number, reason?: string): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/move`, { stage, reason });
  }

  changeBuyer(id: number, payload: ChangeBuyerPayload): Observable<PurchaseRequest> {
    return this.http.patch<PurchaseRequest>(`${this.base}/requests/${id}/buyer`, { ...payload });
  }

  setApprovers(id: number, payload: SetApproversPayload): Observable<PurchaseRequest> {
    return this.http.patch<PurchaseRequest>(`${this.base}/requests/${id}/approvers`, { ...payload });
  }

  getRequestActionHistory(id: number): Observable<PurchaseRequestActionLog[]> {
    // O Swagger define a resposta como array puro, mas normalizamos também o
    // envelope { data: [...] } para não engolir o histórico caso o back mude o shape.
    return this.http
      .get<PurchaseRequestActionLog[] | { data?: PurchaseRequestActionLog[] }>(`${this.base}/requests/${id}/history`)
      .pipe(map(res => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  /** Lookup de usuários — inclui `area` (BK-6: auto-preencher "Área Requisitante"). */
  getUsersLookup(): Observable<PurchaseRef[]> {
    const params = new HttpParams().set('take', '500');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}/v1/users`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows.map(r => ({
          id:   Number(r['id']),
          name: String(r['name'] ?? r['title'] ?? r['id']),
          area: (r['area'] as string | null) ?? null,
        }));
      }));
  }

  getProjectsLookup(): Observable<PurchaseRef[]> {
    // GET /v1/projects sem filtro devolve Centros de Custo E Projetos juntos, cada linha
    // marcada com _entityType. O select de Projeto da requisição deve listar SÓ projetos —
    // selecionar um centro de custo aqui causava 400 (projectId FK inexistente na tabela projects).
    const params = new HttpParams().set('take', '500');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}/v1/projects`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows
          .filter(r => r['_entityType'] === 'project')
          // CP-20: carrega costCenterId para a cascata Centro de custo → Projeto.
          .map(r => ({ id: Number(r['id']), name: String(r['name'] ?? r['title'] ?? r['id']), costCenterId: r['costCenterId'] != null ? Number(r['costCenterId']) : null }));
      }));
  }

  /** CP-19/CP-20: Atividades (nível abaixo de Projeto) para a alocação em cascata. */
  getActivitiesLookup(): Observable<PurchaseRef[]> {
    const params = new HttpParams().set('take', '500');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}/v1/projects`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows
          .filter(r => r['_entityType'] === 'activity')
          .map(r => ({ id: Number(r['id']), name: String(r['name'] ?? r['title'] ?? r['id']), parentProjectId: r['parentProjectId'] != null ? Number(r['parentProjectId']) : null }));
      }));
  }

  /** FE-13: Centro de Custo (campo distinto de Projeto na requisição). */
  getCostCentersLookup(): Observable<PurchaseRef[]> {
    const params = new HttpParams().set('take', '500').set('type', 'centro_de_custo');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}/v1/projects`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows.map(r => ({ id: Number(r['id']), name: String(r['name'] ?? r['title'] ?? r['id']) }));
      }));
  }

  getAccountPlansLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/account-plan', 'title');
  }

  /** Lookup de produtos/serviços — inclui group/unit/costBase (BK-6: auto-preencher o item). */
  getProductsServicesLookup(): Observable<PurchaseRef[]> {
    const params = new HttpParams().set('take', '500');
    const num = (v: unknown): number | null => {
      const n = Number(v);
      return v != null && v !== '' && Number.isFinite(n) ? n : null;
    };
    const pick = (o: Record<string, unknown>, ...ks: string[]): string | null => {
      for (const k of ks) { const v = o[k]; if (typeof v === 'string' && v) return v; }
      return null;
    };
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}/v1/products-services`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows.map(r => ({
          id:       Number(r['id']),
          name:     String(r['name'] ?? r['title'] ?? r['id']),
          group:    pick(r, 'group', 'groupName', 'productGroup'),
          unit:     pick(r, 'measure', 'unit', 'unitOfMeasure', 'measureUnit'),
          costBase: num(r['costBase'] ?? r['cost'] ?? r['price'] ?? r['basePrice']),
        }));
      }));
  }

  getDeliveryLocationsLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/delivery-locations', 'name');
  }

  /** FE-7: fornecedores (stakeholders) para o select de cotação. */
  getSuppliersLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/stakeholders', 'name');
  }

  /** FE-4: alçadas de COMPRAS — para filtrar aprovadores por nível/faixa. */
  getApprovalLimits(): Observable<ApprovalLimit[]> {
    // type=COMPRAS: as alçadas financeiras (FINANCEIRO) não valem para aprovação de requisição.
    const params = new HttpParams().set('take', '500').set('type', 'COMPRAS');
    return this.http
      .get<RawListEnvelope<ApprovalLimit> | ApprovalLimit[]>(`${environment.apiUrl}/v1/approval-limits`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        // Defesa extra: mesmo com o filtro do back, mantém só as de COMPRAS.
        return rows.filter(l => !l.type || l.type === 'COMPRAS');
      }));
  }

  /** Lookup genérico: mapeia qualquer listagem para { id, name } (rótulo por nameKey). */
  private lookup(path: string, nameKey: 'name' | 'title'): Observable<PurchaseRef[]> {
    const params = new HttpParams().set('take', '500');
    return this.http
      .get<RawListEnvelope<Record<string, unknown>> | Record<string, unknown>[]>(`${environment.apiUrl}${path}`, { params })
      .pipe(map(res => {
        const rows = Array.isArray(res) ? res : res.data ?? [];
        return rows.map(r => ({
          id:   Number(r['id']),
          name: String(r[nameKey] ?? r['name'] ?? r['title'] ?? r['id']),
        }));
      }));
  }

  copyRequest(id: number): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/copy`, {});
  }

  exportRequestToQuotation(id: number): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/export-to-quotation`, {});
  }

  completeRequest(id: number): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/complete`, {});
  }

  generateRequestExcel(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/requests/${id}/excel`, { responseType: 'blob' });
  }

  /** FE-12: exportar a requisição em PDF (Blob, gerado no back). */
  generateRequestPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/requests/${id}/pdf`, { responseType: 'blob' });
  }

  /** FE-8: adjudicação (Etapa 4) — by_supplier (1 pedido) ou by_item (N pedidos). */
  award(id: number, payload: AwardPayload): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/award`, payload);
  }

  // ── Anexos da requisição ──────────────────────────────────────────────────────

  attachRequestFile(id: number, payload: AttachFilePayload): Observable<PurchaseFile> {
    return this.http.post<PurchaseFile>(`${this.base}/requests/${id}/files`, payload);
  }

  // CMP-20: sobe um arquivo (multipart) e devolve url/key para anexar.
  uploadFile(file: File): Observable<{ url: string; key: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; key: string }>(`${environment.apiUrl}/v1/upload/one-file`, form);
  }

  // CMP-07: criação rápida de produto/local sem sair da requisição.
  createProductQuick(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(`${environment.apiUrl}/v1/products-services`, { name, type: 'Product', status: 'Active' });
  }
  createLocationQuick(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<{ id: number; name: string }>(`${environment.apiUrl}/v1/delivery-locations`, { name });
  }

  listRequestFiles(id: number): Observable<PurchaseFile[]> {
    return this.http.get<PurchaseFile[]>(`${this.base}/requests/${id}/files`);
  }

  removeRequestFile(id: number, fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/requests/${id}/files/${fileId}`);
  }

  // ── Cotações ──────────────────────────────────────────────────────────────────

  createQuotation(payload: CreateQuotationPayload): Observable<PurchaseQuotation> {
    return this.http.post<PurchaseQuotation>(`${this.base}/quotations`, payload);
  }

  getQuotationPortal(supplierId: number): Observable<PurchaseQuotation[]> {
    return this.http.get<PurchaseQuotation[]>(`${this.base}/quotation-portal/${supplierId}`);
  }

  getQuotationsByRequest(purchaseRequestId: number): Observable<PurchaseQuotation[]> {
    return this.http.get<PurchaseQuotation[]>(`${this.base}/quotations/request/${purchaseRequestId}`);
  }

  approveQuotation(id: number): Observable<PurchaseQuotation> {
    return this.http.patch<PurchaseQuotation>(`${this.base}/quotations/${id}/approve`, {});
  }

  rejectQuotation(id: number): Observable<PurchaseQuotation> {
    return this.http.patch<PurchaseQuotation>(`${this.base}/quotations/${id}/reject`, {});
  }

  // ── Pedidos de Compra (Etapas 5/6) ────────────────────────────────────────────

  getOrders(params: PurchaseOrderListParams = {}): Observable<Page<PurchaseOrder>> {
    let httpParams = new HttpParams();
    if (params.requestId != null) httpParams = httpParams.set('requestId', String(params.requestId));
    if (params.status)            httpParams = httpParams.set('status', params.status);
    if (params.skip != null)      httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null)      httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<PurchaseOrder> | PurchaseOrder[]>(`${this.base}/orders`, { params: httpParams })
      .pipe(map(toPage));
  }

  getOrderById(id: number): Observable<PurchaseOrder> {
    return this.http.get<PurchaseOrder>(`${this.base}/orders/${id}`);
  }

  // ── Contratos ─────────────────────────────────────────────────────────────────

  getContracts(params: PurchaseContractListParams = {}): Observable<Page<PurchaseContract>> {
    let httpParams = new HttpParams();
    if (params.search)       httpParams = httpParams.set('search', params.search);
    if (params.skip != null) httpParams = httpParams.set('skip', String(params.skip));
    if (params.take != null) httpParams = httpParams.set('take', String(params.take));
    return this.http
      .get<RawListEnvelope<PurchaseContract> | PurchaseContract[]>(`${this.base}/contracts`, { params: httpParams })
      .pipe(map(toPage));
  }

  getContractById(id: number): Observable<PurchaseContract> {
    return this.http.get<PurchaseContract>(`${this.base}/contracts/${id}`);
  }

  createContract(payload: CreateContractPayload): Observable<PurchaseContract> {
    return this.http.post<PurchaseContract>(`${this.base}/contracts`, payload);
  }

  updateContract(id: number, payload: UpdateContractPayload): Observable<PurchaseContract> {
    return this.http.patch<PurchaseContract>(`${this.base}/contracts/${id}`, payload);
  }

  deleteContract(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/contracts/${id}`);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  getDashboard(): Observable<PurchaseDashboardResponse> {
    return this.http.get<PurchaseDashboardResponse>(`${this.base}/dashboard`);
  }

  /** Exporta as requisições em Excel (GET /v1/purchases/requests/export/excel). */
  exportRequestsExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/requests/export/excel`, { responseType: 'blob' });
  }
}
