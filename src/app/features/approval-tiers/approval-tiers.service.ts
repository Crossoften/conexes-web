// src/app/features/approval-tiers/approval-tiers.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApprovalTier, ApprovalTierPayload } from './approval-tiers.model';

@Injectable({ providedIn: 'root' })
export class ApprovalTiersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/approval-limits`;

  getAll(): Observable<ApprovalTier[]> {
    return this.http.get<ApprovalTier[]>(this.base);
  }

  getById(id: number): Observable<ApprovalTier> {
    return this.http.get<ApprovalTier>(`${this.base}/${id}`);
  }

  create(payload: ApprovalTierPayload): Observable<ApprovalTier> {
    return this.http.post<ApprovalTier>(this.base, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
