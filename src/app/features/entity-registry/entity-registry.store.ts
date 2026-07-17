// src/app/features/entity-registry/entity-registry.store.ts
import { Injectable, computed, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  EntityRegistry,
  EntityRegistryListItem,
  EntityRegistryPayload,
} from './entity-registry.model';
import { EntityRegistryService } from './entity-registry.service';

interface State {
  items:       EntityRegistryListItem[];
  loading:     boolean;
  filters:     { search: string };
  sort:        { column: keyof EntityRegistryListItem | ''; direction: 'asc' | 'desc' | '' };
  pagination:  { page: number; pageSize: number };
  selectedIds: Set<number>;
}

@Injectable({ providedIn: 'root' })
export class EntityRegistryStore {
  private readonly service = inject(EntityRegistryService);

  private readonly state = signal<State>({
    items:       [],
    loading:     false,
    filters:     { search: '' },
    sort:        { column: '', direction: '' },
    pagination:  { page: 1, pageSize: 10 },
    selectedIds: new Set(),
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  readonly loading     = computed(() => this.state().loading);
  readonly filters     = computed(() => this.state().filters);
  readonly sort        = computed(() => this.state().sort);
  readonly pagination  = computed(() => this.state().pagination);
  readonly selectedIds = computed(() => this.state().selectedIds);

  readonly filteredItems = computed(() => {
    let result = this.state().items;
    const f = this.filters();
    const s = this.sort();

    // Filtro de busca (CNPJ, Razão Social, Nome Fantasia)
    if (f.search) {
      const term = f.search.toLowerCase();
      result = result.filter(item =>
        item.legalName.toLowerCase().includes(term) ||
        item.tradeName.toLowerCase().includes(term) ||
        item.cnpj.includes(term)
      );
    }

    // Ordenação
    if (s.column && s.direction) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const av = String(a[s.column as keyof EntityRegistryListItem] ?? '');
        const bv = String(b[s.column as keyof EntityRegistryListItem] ?? '');
        return av.localeCompare(bv, 'pt-BR') * dir;
      });
    }

    return result;
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredItems().slice(start, start + pageSize);
  });

  readonly allPageSelected = computed(() => {
    const items = this.pageItems();
    return items.length > 0 && items.every(item => this.selectedIds().has(item.id));
  });

  readonly somePageSelected = computed(() => {
    const items = this.pageItems();
    return items.some(item => this.selectedIds().has(item.id)) && !this.allPageSelected();
  });

  // ── Ações HTTP ────────────────────────────────────────────────────────────

  async loadEntities(): Promise<void> {
    this.state.update(s => ({ ...s, loading: true }));
    try {
      const data = await firstValueFrom(this.service.getAll());
      this.state.update(s => ({ ...s, items: data, loading: false }));
    } catch (error) {
      this.state.update(s => ({ ...s, loading: false }));
      console.error('❌ Falha ao listar entidades:', error);
    }
  }

  async getEntityById(id: number): Promise<EntityRegistry | null> {
    try {
      return await firstValueFrom(this.service.getById(id));
    } catch (error) {
      console.error('❌ Falha ao carregar detalhe da entidade:', error);
      return null;
    }
  }

  async createEntity(payload: EntityRegistryPayload): Promise<boolean> {
    this.state.update(s => ({ ...s, loading: true }));
    try {
      const created = await firstValueFrom(this.service.create(payload));
      // Adiciona o novo item resumido no topo da lista
      const listItem = this._toListItem(created);
      this.state.update(s => ({ ...s, items: [listItem, ...s.items], loading: false }));
      return true;
    } catch (error) {
      this.state.update(s => ({ ...s, loading: false }));
      console.error('❌ Falha ao cadastrar entidade:', error);
      return false;
    }
  }

  async updateEntity(id: number, payload: Partial<EntityRegistryPayload>): Promise<boolean> {
    this.state.update(s => ({ ...s, loading: true }));
    try {
      const updated = await firstValueFrom(this.service.update(id, payload));
      const listItem = this._toListItem(updated);
      this.state.update(s => ({
        ...s,
        items: s.items.map(item => item.id === id ? listItem : item),
        loading: false,
      }));
      return true;
    } catch (error) {
      this.state.update(s => ({ ...s, loading: false }));
      console.error('❌ Falha ao atualizar entidade:', error);
      return false;
    }
  }

  async deleteEntity(id: number): Promise<boolean> {
    this.state.update(s => ({ ...s, loading: true }));
    try {
      await firstValueFrom(this.service.remove(id));
      this.state.update(s => ({
        ...s,
        items: s.items.filter(item => item.id !== id),
        selectedIds: new Set([...s.selectedIds].filter(sid => sid !== id)),
        loading: false,
      }));
      return true;
    } catch (error) {
      this.state.update(s => ({ ...s, loading: false }));
      console.error('❌ Falha ao excluir entidade:', error);
      return false;
    }
  }

  // ── Updaters de estado ────────────────────────────────────────────────────

  setSearch(search: string): void {
    this.state.update(s => ({ ...s, filters: { ...s.filters, search }, pagination: { ...s.pagination, page: 1 } }));
  }

  setSort(column: keyof EntityRegistryListItem): void {
    this.state.update(s => {
      const direction = s.sort.column === column && s.sort.direction === 'asc' ? 'desc' : 'asc';
      return { ...s, sort: { column, direction } };
    });
  }

  setPage(page: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } }));
  }

  setPageSize(pageSize: number): void {
    this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
  }

  toggleRow(id: number): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, selectedIds: newSet };
    });
  }

  toggleAllPage(items: EntityRegistryListItem[]): void {
    this.state.update(s => {
      const newSet = new Set(s.selectedIds);
      const allSelected = items.every(item => newSet.has(item.id));
      items.forEach(item => allSelected ? newSet.delete(item.id) : newSet.add(item.id));
      return { ...s, selectedIds: newSet };
    });
  }

  // ── Utilitário interno ────────────────────────────────────────────────────

  private _toListItem(entity: EntityRegistry): EntityRegistryListItem {
    return {
      id:        entity.id,
      cnpj:      entity.cnpj,
      legalName: entity.legalName,
      tradeName: entity.tradeName,
      city:      entity.city,
    };
  }
}
