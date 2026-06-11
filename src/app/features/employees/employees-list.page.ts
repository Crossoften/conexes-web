// src/app/features/employees/employees-list.page.ts
import { Component, inject, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EmployeesStore } from './employees.store';
import { EmployeeDetailModalComponent } from './components/employee-detail.modal';
import { Employee, EmployeeUpdatePayload } from './employees.model';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [FormsModule, NgClass, NgIf, RouterLink, EmployeeDetailModalComponent],
  providers: [EmployeesStore],
  templateUrl: './employees-list.page.html',
  styleUrl: './employees-list.page.scss',
})
export class EmployeesListPage implements OnInit {
  readonly store = inject(EmployeesStore);

  readonly statusOptions = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Inativo',            value: 'Inactive' },
  ];

  readonly typeOptions = [
    { label: 'Selecione o tipo', value: ''            },
    { label: 'Colaborador',      value: 'COLABORADOR' },
    { label: 'Dirigente',        value: 'DIRIGENTE'   },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.store.filteredTotal() / this.store.pagination().pageSize))
  );

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total   = this.totalPages();
    const current = this.store.pagination().page;
    const pages: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.store.load();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  openDetail(item: Employee): void {
    this.store.openDetail(item);
  }

  onModalClose(): void {
    this.store.closeDetail();
  }

  onModalSaved(payload: EmployeeUpdatePayload): void {
    const selected = this.store.selected();
    if (selected) this.store.update(selected.id, payload);
  }

  onModalDelete(id: number): void {
    this.store.delete(id);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof Employee): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Employee): number { return item.id; }
}