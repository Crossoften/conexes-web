import { Component, Input, signal, effect } from '@angular/core';
import { ListPageConfig, ListParams } from '../../models/list-page.model';

import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { DataTableComponent } from '../data-table/data-table.component';

@Component({
  selector: 'app-list-page',
  standalone: true,

  imports: [FilterBarComponent, DataTableComponent],

  templateUrl: './list-page.component.html',
})
export class ListPageComponent<T extends Record<string, any>> {
  @Input({ required: true }) config!: ListPageConfig<T>;

  data = signal<T[]>([]);
  total = signal(0);
  loading = signal(false);

  params = signal<ListParams>({
    page: 1,
    pageSize: 10,
  });

  constructor() {
    effect(() => {
      this.load();
    });
  }

  async load() {
    this.loading.set(true);

    try {
      const result = await this.config.fetch(this.params());
      this.data.set(result.data);
      this.total.set(result.total);
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(filters: Record<string, any>) {
    this.params.update(p => ({ ...p, filters, page: 1 }));
  }

  onSearch(search: string) {
    this.params.update(p => ({ ...p, search, page: 1 }));
  }

  onPageChange(page: number) {
    this.params.update(p => ({ ...p, page }));
  }

  get columnsUnsafe() {
  return this.config.columns as any;
}

get dataUnsafe() {
  return this.data() as any;
}

get actionsUnsafe() {
  return this.config.actions as any;
}
}