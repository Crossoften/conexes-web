// src/app/features/entity-registry/entity-registry-list.page.ts
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { EntityRegistryStore } from './entity-registry.store';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EntityRegistry, EntityRegistryListItem, EntityRegistryPayload } from './entity-registry.model';
import { EntityRegistryDetailModalComponent } from './components/entity-registry-detail.modal';

@Component({
  selector: 'app-entity-registry-list',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    RouterLink,
    EntityRegistryDetailModalComponent,
  ],
  templateUrl: './entity-registry-list.page.html',
  styleUrls: ['./entity-registry-list.page.scss'],
})
export class EntityRegistryListPage implements OnInit {
  protected readonly store = inject(EntityRegistryStore);

  // ── Estado do modal ───────────────────────────────────────────────────────
  protected readonly selectedEntity  = signal<EntityRegistry | null>(null);
  protected readonly showModal       = signal(false);
  protected readonly modalLoading    = signal(false);

  // ── Opções dos filtros ────────────────────────────────────────────────────
  protected readonly statusOptions = [
    { label: 'Todos os status', value: '' },
    { label: 'Ativo',           value: 'ACTIVE' },
    { label: 'Inativo',         value: 'INACTIVE' },
  ];

  protected readonly typeOptions = [
    { label: 'Todos os tipos',  value: '' },
    { label: 'Pessoa Física',   value: 'PF' },
    { label: 'Pessoa Jurídica', value: 'PJ' },
  ];

  protected readonly pageSizeOptions = [5, 10, 20, 50];

  // ── Paginação ─────────────────────────────────────────────────────────────
  protected readonly totalPages = computed(() => {
    const total = this.store.filteredTotal();
    const size  = this.store.pagination().pageSize;
    return Math.max(1, Math.ceil(total / size));
  });

  protected readonly pageNumbers = computed<(number | string)[]>(() => {
    const pages   = this.totalPages();
    const current = this.store.pagination().page;

    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

    const items: (number | string)[] = [1];
    if (current > 3) items.push('...');
    const start = Math.max(2, current - 1);
    const end   = Math.min(pages - 1, current + 1);
    for (let i = start; i <= end; i++) items.push(i);
    if (current < pages - 2) items.push('...');
    items.push(pages);
    return items;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.store.loadEntities();
  }

  // ── Filtros / Paginação ───────────────────────────────────────────────────
  protected onSearch(value: string): void {
    this.store.setSearch(value);
  }

  protected goToPage(page: number | string): void {
    if (typeof page === 'number') this.store.setPage(page);
  }

  protected getSortState(column: keyof EntityRegistryListItem): 'asc' | 'desc' | '' {
    const s = this.store.sort();
    return s.column === column ? (s.direction as 'asc' | 'desc') : '';
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  protected async openModal(item: EntityRegistryListItem): Promise<void> {
    this.modalLoading.set(true);
    this.showModal.set(true);
    const entity = await this.store.getEntityById(item.id);
    this.selectedEntity.set(entity);
    this.modalLoading.set(false);
  }

  protected closeModal(): void {
    this.showModal.set(false);
    this.selectedEntity.set(null);
  }

  protected async onSaved(payload: Partial<EntityRegistryPayload>): Promise<void> {
    const id = this.selectedEntity()?.id;
    if (!id) return;
    const ok = await this.store.updateEntity(id, payload);
    if (ok) this.closeModal();
  }

  protected async onDelete(id: number): Promise<void> {
    const confirmed = confirm('Confirma a exclusão desta entidade?');
    if (!confirmed) return;
    const ok = await this.store.deleteEntity(id);
    if (ok) this.closeModal();
  }
}
