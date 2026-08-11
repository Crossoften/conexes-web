// src/app/features/transparency/transparency.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TransparencyPartnership {
  id: number;
  title: string;
  grantor: string;
  entity: string;
  startDate: string | null;
  endDate: string | null;
  totalValue: number;
  receivedValue: number;
  accountabilityStatus: string;
}

export interface TransparencyAccountability {
  title: string;
  periodStart: string | null;
  periodEnd: string | null;
  status: string;
  approvedAt: string | null;
}

export interface TransparencyDetail extends TransparencyPartnership {
  object: string | null;
  breakdown: { municipal: number; state: number; federal: number };
  accountabilities: TransparencyAccountability[];
}

@Injectable({ providedIn: 'root' })
export class TransparencyService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/v1/transparency`;

  list(): Observable<TransparencyPartnership[]> {
    return this.http.get<TransparencyPartnership[]>(`${this.api}/partnerships`);
  }

  getById(id: number): Observable<TransparencyDetail> {
    return this.http.get<TransparencyDetail>(`${this.api}/partnerships/${id}`);
  }
}
