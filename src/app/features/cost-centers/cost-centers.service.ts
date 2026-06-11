// src/app/features/cost-centers/cost-centers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CostCenter, CostCenterPayload } from './cost-centers.model';

@Injectable({ providedIn: 'root' })
export class CostCentersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/projects`;

  getAll(): Observable<CostCenter[]> {
    return this.http.get<CostCenter[]>(this.base);
  }

  getById(id: number): Observable<CostCenter> {
    return this.http.get<CostCenter>(`${this.base}/${id}`);
  }

  create(payload: CostCenterPayload): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.base, payload);
  }

  update(id: number, payload: Partial<CostCenterPayload>): Observable<CostCenter> {
    return this.http.patch<CostCenter>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}