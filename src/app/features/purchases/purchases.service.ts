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

  rejectRequest(id: number, reason?: string): Observable<PurchaseRequest> {
    return this.http.post<PurchaseRequest>(`${this.base}/requests/${id}/reject`, { reason });
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
    return this.http.patch<PurchaseRequest>(`${this.base}/requests/${id}/buyer`, payload);
  }

  setApprovers(id: number, payload: SetApproversPayload): Observable<PurchaseRequest> {
    return this.http.patch<PurchaseRequest>(`${this.base}/requests/${id}/approvers`, payload);
  }

  getRequestActionHistory(id: number): Observable<PurchaseRequestActionLog[]> {
    return this.http.get<PurchaseRequestActionLog[]>(`${this.base}/requests/${id}/history`);
  }

  /** Lookup de usuários (para selects de comprador / aprovadores). */
  getUsersLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/users', 'name');
  }

  getProjectsLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/projects', 'name');
  }

  getAccountPlansLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/account-plan', 'title');
  }

  getProductsServicesLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/products-services', 'name');
  }

  getDeliveryLocationsLookup(): Observable<PurchaseRef[]> {
    return this.lookup('/v1/delivery-locations', 'name');
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

  // ── Anexos da requisição ──────────────────────────────────────────────────────

  attachRequestFile(id: number, payload: AttachFilePayload): Observable<PurchaseFile> {
    return this.http.post<PurchaseFile>(`${this.base}/requests/${id}/files`, payload);
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
}
