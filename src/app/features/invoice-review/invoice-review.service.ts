// src/app/features/invoice-review/invoice-review.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InvoiceCard {
  id: number;
  description: string | null;
  supplier: string | null;
  amount: number;
  dueDate: string | null;
  status: string;
}
export interface OrderOption { id: number; supplier: string; total: number; }

/**
 * COMP-18: o que o financeiro precisa CONFERIR antes de faturar. A tela só
 * oferecia um seletor "Pedido #N — fornecedor — total": faturava-se às cegas,
 * sem ver os itens nem os anexos (NF/CNDs) que vêm junto.
 */
export interface OrderItemLine {
  name: string; unit: string | null; quantity: number; unitValue: number; totalValue: number;
}
export interface OrderFile { id: number; fileUrl: string; fileKey: string | null; }
export interface OrderDetail {
  id: number;
  supplier: string;
  document: string | null;
  total: number;
  freight: number;
  discount: number;
  status: string | null;
  requestId: number | null;
  requestTitle: string | null;
  items: OrderItemLine[];
  files: OrderFile[];
}

@Injectable({ providedIn: 'root' })
export class InvoiceReviewService {
  private http = inject(HttpClient);
  private ap = `${environment.apiUrl}/v1/accounts-payable`;

  byStatus(status: string): Observable<InvoiceCard[]> {
    const params = new HttpParams().set('status', status).set('take', '200');
    return this.http.get<any>(this.ap, { params }).pipe(map(res => {
      const rows: any[] = Array.isArray(res) ? res : res?.data ?? [];
      return rows.map(r => ({
        id: r.id, description: r.description, supplier: r.stakeholder?.name ?? null,
        amount: r.grossAmount ?? r.amount ?? 0, dueDate: r.dueDate, status: r.status,
      }));
    }));
  }

  createFromOrder(orderId: number): Observable<unknown> {
    return this.http.post(`${this.ap}/from-order/${orderId}`, {});
  }
  validate(id: number): Observable<unknown> { return this.http.patch(`${this.ap}/${id}/validate`, {}); }
  returnToPurchasing(id: number, reason: string): Observable<unknown> { return this.http.patch(`${this.ap}/${id}/return`, { reason }); }

  /** Pedidos de compra disponíveis para faturar (pré-lançar). */
  orders(): Observable<OrderOption[]> {
    return this.http.get<any>(`${environment.apiUrl}/v1/purchases/orders`).pipe(map(res => {
      const rows: any[] = Array.isArray(res) ? res : res?.data ?? [];
      return rows.map(o => ({ id: o.id, supplier: o.supplier?.name ?? `Fornecedor #${o.supplierId}`, total: o.totalValue ?? 0 }));
    }));
  }

  /**
   * COMP-18: abre o pedido para conferência — itens, valores e os anexos.
   *
   * Os anexos (NF, CNDs) ficam na REQUISIÇÃO, não no pedido; por isso a segunda
   * chamada. Quando o pedido não tem requisição vinculada, devolve lista vazia em
   * vez de derrubar a conferência inteira — pedido sem anexo ainda precisa ter os
   * itens conferidos.
   */
  orderDetail(orderId: number): Observable<OrderDetail> {
    const base = `${environment.apiUrl}/v1/purchases`;
    return this.http.get<any>(`${base}/orders/${orderId}`).pipe(
      switchMap(o => {
        const reqId = o?.purchaseRequest?.id ?? o?.purchaseRequestId ?? null;
        const anexos = reqId
          ? this.http.get<any[]>(`${base}/requests/${reqId}/files`).pipe(catchError(() => of([])))
          : of([] as any[]);
        return anexos.pipe(map(files => this.montarDetalhe(o, files)));
      }),
    );
  }

  private montarDetalhe(o: any, files: any[]): OrderDetail {
    return {
      id: o.id,
      supplier: o.supplier?.name ?? `Fornecedor #${o.supplierId}`,
      document: o.supplier?.document ?? null,
      total: o.totalValue ?? 0,
      freight: o.freight ?? 0,
      discount: o.discount ?? 0,
      status: o.status ?? null,
      requestId: o.purchaseRequest?.id ?? o.purchaseRequestId ?? null,
      requestTitle: o.purchaseRequest?.title ?? null,
      items: (o.items ?? []).map((i: any) => ({
        name: i.name ?? i.description ?? `Item #${i.id}`,
        unit: i.unit ?? null,
        quantity: i.quantity ?? 0,
        unitValue: i.unitValue ?? 0,
        totalValue: i.totalValue ?? (i.unitValue ?? 0) * (i.quantity ?? 0),
      })),
      files: (files ?? []).map(f => ({ id: f.id, fileUrl: f.fileUrl, fileKey: f.fileKey ?? null })),
    };
  }
}
