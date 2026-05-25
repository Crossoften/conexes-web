// src/app/features/users/users.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserPayload } from './users.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/v1/user-management`;

  // ── Estado compartilhado entre os dois steps do formulário ────────────────
  readonly draftUserData = signal<Partial<UserPayload> | null>(null);

  saveDraft(data: Partial<UserPayload>): void {
    this.draftUserData.set(data);
  }

  clearDraft(): void {
    this.draftUserData.set(null);
  }

  // ── API ───────────────────────────────────────────────────────────────────

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  create(payload: UserPayload): Observable<User> {
    return this.http.post<User>(this.base, payload);
  }
}
