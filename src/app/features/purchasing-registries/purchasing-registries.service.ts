// src/app/features/purchasing-registries/purchasing-registries.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../../shared/models/list-page.model';
import {
  ApiProductService,
  ApiDeliveryLocation,
  ApiStakeholder,
  ApiProject,
  ProductServicePayload,
  DeliveryLocationPayload,
} from './purchasing-registries.model';

interface RawListEnvelope<T> { data?: T[]; total?: number; count?: number; }

function toPage<T>(res: RawListEnvelope<T> | T[]): Page<T> {
  if (Array.isArray(res)) return { data: res, total: res.length };
  const data = res.data ?? [];
  return { data, total: res.total ?? res.count ?? data.length };
}

export interface RegistryListParams {
  search?: string;
  status?: string;
  skip?:   number;
  take?:   number;
}

@Injectable({ providedIn: 'root' })
export class PurchasingRegistriesService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private buildParams(params: RegistryListParams, extra: Record<string, string> = {}): HttpParams {
    let p = new HttpParams();
    if (params.search)      p = p.set('search', params.search);
    if (params.status)      p = p.set('status', params.status);
    if (params.skip != null) p = p.set('skip', String(params.skip));
    if (params.take != null) p = p.set('take', String(params.take));
    for (const [k, v] of Object.entries(extra)) p = p.set(k, v);
    return p;
  }

  // ── Produtos e serviços (CRUD) ──────────────────────────────────────────────
  listProducts(params: RegistryListParams = {}): Observable<Page<ApiProductService>> {
    return this.http
      .get<RawListEnvelope<ApiProductService> | ApiProductService[]>(`${this.base}/v1/products-services`, { params: this.buildParams(params) })
      .pipe(map(toPage));
  }
  getProduct(id: number): Observable<ApiProductService> {
    return this.http.get<ApiProductService>(`${this.base}/v1/products-services/${id}`);
  }
  createProduct(payload: ProductServicePayload): Observable<ApiProductService> {
    return this.http.post<ApiProductService>(`${this.base}/v1/products-services`, payload);
  }
  updateProduct(id: number, payload: Partial<ProductServicePayload>): Observable<ApiProductService> {
    return this.http.patch<ApiProductService>(`${this.base}/v1/products-services/${id}`, payload);
  }
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/v1/products-services/${id}`);
  }

  // ── Locais de entrega (CRUD) ────────────────────────────────────────────────
  listLocations(params: RegistryListParams = {}): Observable<Page<ApiDeliveryLocation>> {
    return this.http
      .get<RawListEnvelope<ApiDeliveryLocation> | ApiDeliveryLocation[]>(`${this.base}/v1/delivery-locations`, { params: this.buildParams(params) })
      .pipe(map(toPage));
  }
  getLocation(id: number): Observable<ApiDeliveryLocation> {
    return this.http.get<ApiDeliveryLocation>(`${this.base}/v1/delivery-locations/${id}`);
  }
  createLocation(payload: DeliveryLocationPayload): Observable<ApiDeliveryLocation> {
    return this.http.post<ApiDeliveryLocation>(`${this.base}/v1/delivery-locations`, payload);
  }
  updateLocation(id: number, payload: Partial<DeliveryLocationPayload>): Observable<ApiDeliveryLocation> {
    return this.http.patch<ApiDeliveryLocation>(`${this.base}/v1/delivery-locations/${id}`, payload);
  }
  deleteLocation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/v1/delivery-locations/${id}`);
  }

  // ── Fornecedores e Centros de Custo (somente listagem) ──────────────────────
  listSuppliers(params: RegistryListParams = {}): Observable<Page<ApiStakeholder>> {
    return this.http
      .get<RawListEnvelope<ApiStakeholder> | ApiStakeholder[]>(`${this.base}/v1/stakeholders`, { params: this.buildParams(params) })
      .pipe(map(toPage));
  }
  listCostCenters(params: RegistryListParams = {}): Observable<Page<ApiProject>> {
    return this.http
      .get<RawListEnvelope<ApiProject> | ApiProject[]>(`${this.base}/v1/projects`, { params: this.buildParams(params, { type: 'centro_de_custo' }) })
      .pipe(map(toPage));
  }
}
