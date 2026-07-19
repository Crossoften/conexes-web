// src/app/features/entity-registry/entity-registry.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

  /** GET /v1/institutional/entities — lista resumida (envelope { data } tolerante) */
  getAll(): Observable<EntityRegistryListItem[]> {
    return this.http
      .get<EntityRegistryListItem[] | { data?: EntityRegistryListItem[] }>(this.baseUrl)
      .pipe(map(res => (Array.isArray(res) ? res : res?.data ?? [])));
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

  /**
   * POST /upload/one-file — upload de arquivo (png/jpg/jpeg/pdf), multipart campo `file`.
   * A resposta não tem schema no Swagger ("devolve o link"); lemos o link/key de forma
   * tolerante entre os nomes mais comuns.
   */
  uploadFile(file: File): Observable<{ url: string; key: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<unknown>(`${environment.apiUrl}/upload/one-file`, form).pipe(
      map(res => {
        const r = (res ?? {}) as Record<string, unknown>;
        const pick = (...keys: string[]): string => {
          for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v) return v; }
          return '';
        };
        return {
          url: typeof res === 'string' ? res : pick('url', 'link', 'fileUrl', 'location', 'Location', 'path'),
          key: pick('key', 'Key', 'fileKey'),
        };
      }),
    );
  }
}
