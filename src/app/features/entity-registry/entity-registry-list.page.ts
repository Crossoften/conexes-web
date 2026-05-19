// src/app/features/entity-registry/entity-registry-list.page.ts
import { Component, OnInit, inject, computed } from '@angular/core';
import { EntityRegistryStore } from './entity-registry.store';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EntityRegistry } from './entity-registry.model';

@Component({
  selector: 'app-entity-registry-list',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, RouterLink, AsyncPipe],
  templateUrl: './entity-registry-list.page.html',
  styleUrls: ['./entity-registry-list.page.scss']
})
export class EntityRegistryListPage implements OnInit {
  protected readonly store = inject(EntityRegistryStore);

  protected readonly statusOptions = [
    { label: 'Ativo', value: 'ACTIVE' },
    { label: 'Inativo', value: 'INACTIVE' }
  ];

  protected readonly typeOptions = [
    { label: 'Matriz', value: 'MAIN' },
    { label: 'Filial', value: 'BRANCH' }
  ];

  protected readonly pageSizeOptions = [5, 10, 20, 50];

  protected readonly totalPages = computed(() => {
    const total = this.store.filteredTotal();
    const size = this.store.pagination().pageSize;
    return Math.max(1, Math.ceil(total / size));
  });

  // Corrigida a assinatura do tipo do computed para aceitar strings em harmonia com o HTML
  protected readonly pageNumbers = computed<(number | string)[]>(() => {
    const pages = this.totalPages();
    
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }

    const current = this.store.pagination().page;
    const items: (number | string)[] = [];

    items.push(1);
    if (current > 3) {
      items.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(pages - 1, current + 1);

    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (current < pages - 2) {
      items.push('...');
    }
    items.push(pages);

    return items;
  });

  ngOnInit() {
    // Força o disparo automático da requisição GET real no servidor
    this.store.loadEntities();
  }

  protected onSearch(value: string): void {
    this.store.setSearch(value);
  }

  protected goToPage(page: number | string): void {
    if (typeof page === 'number') {
      this.store.setPage(page);
    }
  }

  protected getSortState(column: keyof EntityRegistry): 'asc' | 'desc' | '' {
    const currentSort = this.store.sort();
    if (currentSort.column === column) {
      return currentSort.direction as 'asc' | 'desc';
    }
    return '';
  }
}