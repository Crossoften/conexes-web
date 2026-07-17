// src/app/features/entity-registry/entity-registry.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EntityRegistry,
  EntityRegistryListItem,
  EntityRegistryPayload,
} from './entity-registry.model';

@Injectable({ providedIn: 'root' })
export class EntityRegistryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/institutional/entities`;

  /** GET /v1/institutional/entities — lista resumida */
  getAll(): Observable<EntityRegistryListItem[]> {
    return this.http.get<EntityRegistryListItem[]>(this.baseUrl);
  }

  /** GET /v1/institutional/entities/:id — detalhe completo */
  getById(id: number): Observable<EntityRegistry> {
    return this.http.get<EntityRegistry>(`${this.baseUrl}/${id}`);
  }

  /** POST /v1/institutional/entities */
  create(payload: EntityRegistryPayload): Observable<EntityRegistry> {
    return this.http.post<EntityRegistry>(this.baseUrl, payload);
  }

  /** PATCH /v1/institutional/entities/:id */
  update(id: number, payload: Partial<EntityRegistryPayload>): Observable<EntityRegistry> {
    return this.http.patch<EntityRegistry>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /v1/institutional/entities/:id */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
