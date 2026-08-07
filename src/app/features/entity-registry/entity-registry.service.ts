// src/app/features/entity-registry/entity-registry.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EntityRegistry,
  EntityRegistryListItem,
  EntityRegistryPayload,
  EntityHistoryEntry,
  EntityHistoryChange,
  EntityCnpjLookup,
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

  /** BK-16: GET /entities/cnpj/:cnpj — consulta na Receita Federal. */
  getCnpjData(cnpj: string): Observable<EntityCnpjLookup> {
    const clean = cnpj.replace(/\D/g, '');
    return this.http.get<EntityCnpjLookup>(`${this.baseUrl}/cnpj/${clean}`);
  }

  /**
   * BK-9: GET /v1/institutional/entities/:id/history — histórico de alterações.
   * O Swagger não detalha o shape; normalizamos de forma tolerante (envelope
   * `data`/array e nomes de campo alternativos para data/autor/ação/mudanças).
   */
  getHistory(id: number): Observable<EntityHistoryEntry[]> {
    return this.http.get<unknown>(`${this.baseUrl}/${id}/history`).pipe(
      map(res => {
        const rows: unknown[] = Array.isArray(res)
          ? res
          : ((res as { data?: unknown[] })?.data ?? []);
        return rows.map(r => this.normalizeHistoryEntry(r));
      }),
    );
  }

  private normalizeHistoryEntry(r: unknown): EntityHistoryEntry {
    const o = (r ?? {}) as Record<string, unknown>;
    const str = (...ks: string[]): string => {
      for (const k of ks) { const v = o[k]; if (typeof v === 'string' && v) return v; }
      return '';
    };

    const rawChanges = o['changes'] ?? o['diff'] ?? o['fields'] ?? o['changedFields'];
    let changes: EntityHistoryChange[] | undefined;
    if (Array.isArray(rawChanges)) {
      changes = rawChanges.map(c => {
        const co = (c ?? {}) as Record<string, unknown>;
        const pick = (...ks: string[]): string => {
          for (const k of ks) { const v = co[k]; if (v != null && v !== '') return String(v); }
          return '';
        };
        return {
          field: pick('field', 'name', 'property', 'key', 'label'),
          from:  pick('from', 'oldValue', 'old', 'previous', 'before'),
          to:    pick('to', 'newValue', 'new', 'current', 'after', 'value'),
        };
      }).filter(c => c.field || c.from || c.to);
    }

    // `user` pode vir como string OU objeto { id, name } — extraímos o nome.
    const userRaw = o['user'] ?? o['author'] ?? o['changedBy'] ?? o['performedBy'] ?? o['actor'];
    const user = typeof userRaw === 'string'
      ? userRaw
      : ((userRaw as Record<string, unknown>)?.['name'] ?? (userRaw as Record<string, unknown>)?.['userName'] ?? '') as string;

    return {
      date:        str('date', 'createdAt', 'timestamp', 'changedAt', 'updatedAt', 'when'),
      user:        user || str('userName') || undefined,
      action:      str('action', 'event', 'type', 'operation') || undefined,
      description: str('description', 'message', 'detail', 'summary') || undefined,
      changes:     changes?.length ? changes : undefined,
    };
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
