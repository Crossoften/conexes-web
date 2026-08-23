// src/app/features/purchasing-registries/purchasing-registries-list.page.ts
import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { PurchasingRegistriesStore } from './purchasing-registries.store';
import { PurchasingRegistriesService } from './purchasing-registries.service';
import { RegistryStatus, REGISTRY_STATUS_CONFIG, Product, DeliveryLocation } from './purchasing-registries.model';
import { Router } from "@angular/router";

@Component({
  selector: 'app-purchasing-registries-list',
  standalone: true,
  imports: [FormsModule, NgClass],
  providers: [PurchasingRegistriesStore],
  templateUrl: './purchasing-registries-list.page.html',
  styleUrl: './purchasing-registries-list.page.scss',
})
export class PurchasingRegistriesListPage {
  readonly store = inject(PurchasingRegistriesStore);
  private  router = inject(Router);
  private  svc    = inject(PurchasingRegistriesService);
  readonly statusConfig = REGISTRY_STATUS_CONFIG;

  constructor() {
    this.store.load();
  }

  // ── Export (FUNC-004) — só a aba PRODUCTS tem endpoint no back ──────────────
  readonly exporting = signal(false);

  onExport(): void {
    if (this.exporting() || this.tableKind() !== 'PRODUCTS') return;
    this.exporting.set(true);
    this.svc.exportProductsExcel().subscribe({
      next: (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'produtos-servicos.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  /** Rota do botão "Novo" conforme a aba (só Produtos e Locais têm cadastro aqui). */
  // CMP-09: Produtos e Serviços compartilham a mesma tabela (@switch não faz fall-through).
  tableKind(): 'PRODUCTS' | 'LOCATIONS' | 'OTHER' {
    const t = this.store.activeTab();
    if (t === 'PRODUCTS' || t === 'SERVICES') return 'PRODUCTS';
    if (t === 'LOCATIONS') return 'LOCATIONS';
    return 'OTHER';
  }

  newRoute(): string[] | null {
    const tab = this.store.activeTab();
    if (tab === 'PRODUCTS' || tab === 'SERVICES') return ['/purchasing-registries/new'];
    if (tab === 'LOCATIONS') return ['/purchasing-registries/locations/new'];
    return null;
  }

  goNew() {
    const r = this.newRoute();
    if (r) this.router.navigate(r);
  }

  // POS-05: gestão de grupos e fabricantes.
  goAux() { this.router.navigate(['/purchasing-registries/auxiliares']); }

  readonly statusOptions: { label: string; value: RegistryStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Ativo',    value: 'Active' },
    { label: 'Pendente', value: 'Pending' },
    { label: 'Inativo',  value: 'Inactive' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.store.filteredTotal() / this.store.pagination().pageSize)));

  readonly pageNumbers = computed((): (number | '...')[] => {
    const total = this.totalPages();
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

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: string): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  removeProduct(item: Product)      { this.store.removeProduct(item.apiId); }
  removeLocation(item: DeliveryLocation) { this.store.removeLocation(item.apiId); }

  editProduct(item: Product)        { this.router.navigate(['/purchasing-registries/edit', item.apiId]); }
  editLocation(item: DeliveryLocation) { this.router.navigate(['/purchasing-registries/locations/edit', item.apiId]); }
}