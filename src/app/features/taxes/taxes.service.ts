// src/app/features/taxes/taxes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tax, TaxPayload, StakeholderItem, ScopeOptions, ScopeOption } from './taxes.model';

@Injectable({ providedIn: 'root' })
export class TaxesService {
  private http = inject(HttpClient);
  private base  = `${environment.apiUrl}/v1/tax-service`;
  private stakeholdersBase = `${environment.apiUrl}/v1/stakeholders`;
  private projectsBase     = `${environment.apiUrl}/v1/projects`;

  // ── Tax Service ───────────────────────────────────────────────────────────

  // findAll passou a devolver o envelope { data, count, pages } (o back adicionou
  // status/search/take/skip). Lemos `data` de forma tolerante e trazemos tudo
  // (take alto) — o filtro/paginação continuam client-side (dataset pequeno).
  getAll(): Observable<Tax[]> {
    return this.http
      .get<Tax[] | { data?: Tax[] }>(this.base, { params: { take: '1000' } })
      .pipe(map(res => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  // Busca a configuração de impostos de um fornecedor (usada para pré-preencher).
  getByStakeholder(id: number): Observable<Tax> {
    return this.http.get<Tax>(`${this.base}/stakeholder/${id}`);
  }

  // Naturezas distintas já cadastradas, para o select do formulário
  // (GET /operation-nature do back é busca por ?q= e não lista o catálogo todo).
  getOperationNatures(): Observable<string[]> {
    return this.getAll().pipe(map(list => {
      const seen = new Set<string>();
      for (const t of list) {
        const n = (t.operationNature ?? '').trim();
        if (n) seen.add(n);
      }
      return [...seen].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }));
  }

  // POST é createOrUpdate (upsert por stakeholderId) — serve para criar E editar.
  // O contrato não expõe PATCH/{id} nem GET/{id}.
  save(payload: TaxPayload): Observable<Tax> {
    return this.http.post<Tax>(this.base, payload);
  }

  // O contrato só expõe DELETE /tax-service/stakeholder/{stakeholderId}
  // (o registro é único por stakeholder — upsert). Não existe DELETE /{id}.
  delete(stakeholderId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/stakeholder/${stakeholderId}`);
  }

  /** FUNC-004: exporta os impostos/serviços em Excel. */
  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/export/excel`, { responseType: 'blob' });
  }

  // ── Stakeholders ──────────────────────────────────────────────────────────

  getStakeholders(): Observable<any> {
    return this.http.get<any>(`${this.stakeholdersBase}?take=200`);
  }

  // Detalhe do fornecedor (para trazer os impostos já preenchidos no cadastro dele).
  getStakeholderById(id: number): Observable<any> {
    return this.http.get<any>(`${this.stakeholdersBase}/${id}`);
  }

  // ── Escopo (Centro de Custo / Projeto / Atividade) para os selects do serviço ─
  // Uma única chamada a /v1/projects (envelope { data }) e classificação client-side
  // pelo nível — mesma lógica do módulo Centro de Custo — para não depender do
  // filtro `type` no back (B-CC-07). Evita o 400 de FK por id digitado à mão.
  getScopeOptions(): Observable<ScopeOptions> {
    const toRows = (res: unknown): Record<string, unknown>[] =>
      (Array.isArray(res) ? res : ((res as { data?: unknown[] })?.data ?? [])) as Record<string, unknown>[];
    // IMP-09: a rota padrão de /v1/projects devolve só Centro de Custo/Projeto — as
    // Atividades só vêm com ?kind=atividade. Buscamos as duas e mesclamos.
    return forkJoin({
      base: this.http.get<unknown>(this.projectsBase, { params: { take: '1000' } }),
      acts: this.http.get<unknown>(this.projectsBase, { params: { take: '1000', kind: 'atividade' } }),
    }).pipe(map(({ base, acts }) => {
        const costCenters: ScopeOption[] = [];
        const projects:    ScopeOption[] = [];
        const activities:  ScopeOption[] = [];
        const opt = (o: Record<string, unknown>): ScopeOption => ({ id: Number(o['id']), name: String(o['name'] ?? o['title'] ?? o['id']) });

        for (const o of toRows(base)) {
          if (isNaN(Number(o['id']))) continue;
          const type = o['type'];
          if (o['_entityType'] === 'cost_center' || type === 'centro_de_custo') costCenters.push(opt(o));
          else if (type === 'atividade' || o['entityKind'] === 'atividade' || o['parentProjectId'] != null) activities.push(opt(o));
          else projects.push(opt(o));
        }
        const seen = new Set(activities.map(a => a.id));
        for (const o of toRows(acts)) {
          const id = Number(o['id']);
          if (isNaN(id) || seen.has(id)) continue;
          seen.add(id); activities.push(opt(o));
        }
        return { costCenters, projects, activities };
      }));
  }
}
