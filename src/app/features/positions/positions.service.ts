// src/app/features/positions/positions.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Position, PositionPayload } from './positions.model';

@Injectable({ providedIn: 'root' })
export class PositionsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/institutional/governing-bodies`;

  getAll(): Observable<Position[]> {
    return this.http.get<Position[]>(this.base);
  }

  create(payload: PositionPayload): Observable<Position> {
    return this.http.post<Position>(this.base, payload);
  }
}
