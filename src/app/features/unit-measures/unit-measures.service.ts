// src/app/features/unit-measures/unit-measures.service.ts
// item 10 (reteste 22.09): cadastro de Unidades de Medida (Sigla + Nome) e conversões.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UnitConversion {
  id: number;
  fromUnitId: number;
  toUnitId: number;
  factor: number;
  toUnit?: UnitMeasure;
}

export interface UnitMeasure {
  id: number;
  abbreviation: string;
  name: string;
  status?: string;
  conversionsFrom?: UnitConversion[];
}

@Injectable({ providedIn: 'root' })
export class UnitMeasuresService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  list(): Observable<UnitMeasure[]> {
    return this.http
      .get<{ data?: UnitMeasure[] } | UnitMeasure[]>(`${this.base}/v1/unit-measures`, { params: { take: '500' } })
      .pipe(map(r => (Array.isArray(r) ? r : (r.data ?? []))));
  }
  create(payload: { abbreviation: string; name: string }): Observable<UnitMeasure> {
    return this.http.post<UnitMeasure>(`${this.base}/v1/unit-measures`, payload);
  }
  update(id: number, payload: Partial<{ abbreviation: string; name: string; status: string }>): Observable<UnitMeasure> {
    return this.http.patch<UnitMeasure>(`${this.base}/v1/unit-measures/${id}`, payload);
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/v1/unit-measures/${id}`);
  }
  addConversion(payload: { fromUnitId: number; toUnitId: number; factor: number }): Observable<UnitConversion> {
    return this.http.post<UnitConversion>(`${this.base}/v1/unit-measures/conversions`, payload);
  }
  removeConversion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/v1/unit-measures/conversions/${id}`);
  }
}
