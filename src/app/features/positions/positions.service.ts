// src/app/features/positions/positions.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';
import { Position, PositionPayload } from './positions.model';

// Envelope canônico da API: pode vir `{ data, count, pages }` ou array puro.
interface ListEnvelope<T> { data?: T[]; }

@Injectable({ providedIn: 'root' })
export class PositionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/institutional/governing-bodies`;

  getAll(): Observable<Position[]> {
    return this.http.get<Position[] | ListEnvelope<Position>>(this.base).pipe(
      map(res => Array.isArray(res) ? res : res?.data ?? []),
    );
  }

  getById(id: number): Observable<Position> {
    return this.http.get<Position>(`${this.base}/${id}`);
  }

  create(payload: PositionPayload): Observable<Position> {
    return this.http.post<Position>(this.base, payload);
  }

  update(id: number, payload: PositionPayload): Observable<Position> {
    return this.http.patch<Position>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
