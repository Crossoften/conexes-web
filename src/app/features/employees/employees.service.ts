// src/app/features/employees/employees.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, EmployeePayload, EmployeeUpdatePayload, EmployeePayment } from './employees.model';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/institutional/collaborators`;

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.base);
  }

  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.base}/${id}`);
  }

  create(payload: EmployeePayload): Observable<Employee> {
    return this.http.post<Employee>(this.base, payload);
  }

  update(id: number, payload: EmployeeUpdatePayload): Observable<Employee> {
    return this.http.patch<Employee>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * GET /collaborators/{id}/payments — pagamentos recebidos do colaborador.
   * Sem schema no Swagger; lemos `data`/array e normalizamos os campos de forma
   * tolerante (competência / data / valor).
   */
  getPayments(id: number): Observable<EmployeePayment[]> {
    return this.http.get<unknown>(`${this.base}/${id}/payments`).pipe(
      map(res => {
        const rows: unknown[] = Array.isArray(res)
          ? res
          : ((res as { data?: unknown[] })?.data ?? []);
        return rows.map(r => {
          const o = r as Record<string, unknown>;
          const str = (...ks: string[]): string => {
            for (const k of ks) { const v = o[k]; if (typeof v === 'string' && v) return v; }
            return '';
          };
          const num = (...ks: string[]): number => {
            for (const k of ks) { const n = Number(o[k]); if (Number.isFinite(n) && o[k] != null) return n; }
            return 0;
          };
          return {
            competence: str('competence', 'competencia', 'reference', 'referencia', 'period', 'competency'),
            date:       str('date', 'paymentDate', 'paidAt', 'dueDate', 'data'),
            value:      num('value', 'amount', 'grossValue', 'netValue', 'valor'),
          };
        });
      }),
    );
  }
}