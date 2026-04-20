import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilterConfig } from '../../models/list-page.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent {
  @Input() filters: FilterConfig[] = [];

  @Output() search = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<Record<string, any>>();

  values: Record<string, any> = {};

  onSearchInput(value: string) {
    this.search.emit(value);
  }

  onFilterChange(key: string, value: any) {
    this.values[key] = value;
    this.filterChange.emit(this.values);
  }
}