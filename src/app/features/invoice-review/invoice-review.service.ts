// src/app/features/invoice-review/invoice-review.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
}
