import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TableColumn, TableAction } from '../../models/list-page.model';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T extends Record<string, any>> {
  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input({ required: true }) data: T[] = [];

  @Input() actions?: TableAction<T>[];

  // evita erro de indexação no template
  getValue(row: T, key: keyof T) {
    return row[key];
  }

  hasActions(): boolean {
    return !!this.actions?.length;
  }

  trackByIndex(index: number) {
    return index;
  }
}