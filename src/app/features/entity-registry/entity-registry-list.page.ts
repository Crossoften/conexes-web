// src/app/features/entity-registry/entity-registry-list.page.ts
import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { EntityRegistryStore } from './entity-registry.store';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EntityRegistry, EntityRegistryListItem, EntityRegistryPayload, EntityHistoryEntry } from './entity-registry.model';
import { EntityRegistryDetailModalComponent } from './components/entity-registry-detail.modal';
import { EntityRegistryHistoryModalComponent } from './components/entity-registry-history.modal';
import { EntityRegistryService } from './entity-registry.service';

@Component({
  selector: 'app-entity-registry-list',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    RouterLink,
    EntityRegistryDetailModalComponent,
    EntityRegistryHistoryModalComponent,
  ],
  templateUrl: './entity-registry-list.page.html',
  styleUrls: ['./entity-registry-list.page.scss'],
})
export class EntityRegistryListPage implements OnInit {
  protected readonly store = inject(EntityRegistryStore);
  private readonly svc = inject(EntityRegistryService);

  // ── Estado do modal ───────────────────────────────────────────────────────
  protected readonly selectedEntity  = signal<EntityRegistry | null>(null);
  protected readonly showModal       = signal(false);
  protected readonly modalLoading    = signal(false);
  protected readonly modalMode       = signal<'view' | 'edit'>('view');

  // ── BK-9: histórico da entidade ───────────────────────────────────────────
  protected readonly showHistory      = signal(false);
  protected readonly historyLoading   = signal(false);
  protected readonly historyEntries   = signal<EntityHistoryEntry[]>([]);
  protected readonly historyEntityName = signal('');

  // ── Opções ────────────────────────────────────────────────────────────────
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
  protected async openModal(item: EntityRegistryListItem, mode: 'view' | 'edit' = 'view'): Promise<void> {
    this.modalMode.set(mode);
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

  // ── BK-9: Histórico ───────────────────────────────────────────────────────
  protected openHistory(item: EntityRegistryListItem): void {
    this.historyEntityName.set(item.legalName || item.tradeName || '');
    this.historyEntries.set([]);
    this.historyLoading.set(true);
    this.showHistory.set(true);
    this.svc.getHistory(item.id).subscribe({
      next: entries => { this.historyEntries.set(entries); this.historyLoading.set(false); },
      error: ()      => { this.historyEntries.set([]);      this.historyLoading.set(false); },
    });
  }

  protected closeHistory(): void {
    this.showHistory.set(false);
    this.historyEntries.set([]);
  }

  protected async onSaved(payload: Partial<EntityRegistryPayload>): Promise<void> {
    const id = this.selectedEntity()?.id;
    if (!id) return;
    const ok = await this.store.updateEntity(id, payload);
    if (ok) this.closeModal();
  }

  protected async onDelete(id: number): Promise<void> {
    const confirmed = confirm('Confirma a exclusão desta organização?');
    if (!confirmed) return;
    const ok = await this.store.deleteEntity(id);
    if (ok) this.closeModal();
  }
}
