// src/app/features/taxes/taxes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tax, TaxPayload } from './taxes.model';

@Injectable({ providedIn: 'root' })
export class TaxesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/tax-service`;

  getAll(): Observable<Tax[]> {
    return this.http.get<Tax[]>(this.base);
  }

  getByStakeholder(id: number): Observable<Tax> {
    return this.http.get<Tax>(`${this.base}/stakeholder/${id}`);
  }

  create(payload: TaxPayload): Observable<Tax> {
    return this.http.post<Tax>(this.base, payload);
  }
}
