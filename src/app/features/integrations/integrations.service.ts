// src/app/features/integrations/integrations.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BankPaymentOrder,
  CreatePaymentPayload,
  EmitServiceInvoicePayload,
  FiscalDocument,
  FiscalDocumentList,
  IntegrationStatus,
  OpenFinanceAccount,
} from './integrations.model';

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private http = inject(HttpClient);
  private nfeio = `${environment.apiUrl}/v1/integrations/nfeio`;
  private tec   = `${environment.apiUrl}/v1/integrations/tecnospeed`;

  // ── NFe.io ────────────────────────────────────────────────────────────────
  getCompany(): Observable<any> {
    return this.http.get<any>(`${this.nfeio}/company`);
  }

  listDocuments(params: Record<string, string> = {}): Observable<FiscalDocumentList> {
    return this.http.get<FiscalDocumentList>(`${this.nfeio}/documents`, { params });
  }

  emitServiceInvoice(payload: EmitServiceInvoicePayload): Observable<any> {
    return this.http.post<any>(`${this.nfeio}/service-invoices`, payload);
  }

  getTaxpayer(document: string): Observable<any> {
    return this.http.get<any>(`${this.nfeio}/taxpayers/${document}`);
  }

  syncNfseInbound(): Observable<{ imported: number }> {
    return this.http.get<{ imported: number }>(`${this.nfeio}/inbound/nfse`, { params: { pageCount: '20' } });
  }

  enableNfseInbound(): Observable<any> {
    return this.http.post<any>(`${this.nfeio}/inbound/nfse/enable`, { initialNsu: 0 });
  }

  syncNfeInbound(): Observable<{ imported: number }> {
    return this.http.get<{ imported: number }>(`${this.nfeio}/inbound/nfe`, { params: { pageCount: '20' } });
  }

  // ── TecnoSpeed / PlugBank ───────────────────────────────────────────────────
  getIntegrationStatus(): Observable<IntegrationStatus> {
    return this.http.get<IntegrationStatus>(`${this.tec}/status`);
  }

  listPayments(params: Record<string, string> = {}): Observable<BankPaymentOrder[]> {
    return this.http.get<BankPaymentOrder[]>(`${this.tec}/payments`, { params });
  }

  createPayment(payload: CreatePaymentPayload): Observable<BankPaymentOrder> {
    return this.http.post<BankPaymentOrder>(`${this.tec}/payments`, payload);
  }

  cancelPayment(id: number): Observable<BankPaymentOrder> {
    return this.http.delete<BankPaymentOrder>(`${this.tec}/payments/${id}`);
  }

  refreshPayment(id: number): Observable<BankPaymentOrder> {
    return this.http.get<BankPaymentOrder>(`${this.tec}/payments/${id}`);
  }

  listConnections(): Observable<OpenFinanceAccount[]> {
    return this.http.get<OpenFinanceAccount[]>(`${this.tec}/connections`);
  }

  connectAccount(payload: { bankAccountId?: number; externalAccountId?: string }): Observable<OpenFinanceAccount> {
    return this.http.post<OpenFinanceAccount>(`${this.tec}/connections`, payload);
  }

  syncStatement(payload: { accountId?: number; from?: string; to?: string } = {}): Observable<{ imported: number }> {
    return this.http.post<{ imported: number }>(`${this.tec}/statements/sync`, payload);
  }
}
