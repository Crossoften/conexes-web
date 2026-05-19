// src/app/features/employees/employees.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, EmployeePayload } from './employees.model';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/institutional/collaborators`;

  getAll(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.base);
  }

  create(payload: EmployeePayload): Observable<Employee> {
    return this.http.post<Employee>(this.base, payload);
  }
}
