// src/app/features/agencies/agencies.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agency, AgencyPayload } from './agencies.model';

@Injectable({ providedIn: 'root' })
export class AgenciesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/grantors`;

  getAll(): Observable<Agency[]> {
    return this.http.get<Agency[]>(this.base);
  }

  getById(id: number): Observable<Agency> {
    return this.http.get<Agency>(`${this.base}/${id}`);
  }

  create(payload: AgencyPayload): Observable<Agency> {
    return this.http.post<Agency>(this.base, payload);
  }
}
