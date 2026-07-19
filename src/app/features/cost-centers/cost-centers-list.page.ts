// src/app/features/cost-centers/cost-centers-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CostCentersStore } from './cost-centers.store';
import { CostCenter, CostCenterStatus, COST_CENTER_STATUS_CONFIG, COST_CENTER_TYPE_LABELS, resolveEntityType } from './cost-centers.model';
import { CostCentersDetailModalComponent } from './components/cost-centers-detail.modal';
import { CostCentersService } from './cost-centers.service';

@Component({
  selector: 'app-cost-centers-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, CostCentersDetailModalComponent],
  providers: [CostCentersStore],
  templateUrl: './cost-centers-list.page.html',
  styleUrl: './cost-centers-list.page.scss',
})
export class CostCentersListPage implements OnInit {
  readonly store        = inject(CostCentersStore);
  readonly svc          = inject(CostCentersService);
  readonly statusConfig = COST_CENTER_STATUS_CONFIG;

  // ── Modal ─────────────────────────────────────────────────────────────────
  readonly selectedItem  = signal<CostCenter | null>(null);
  readonly showModal     = signal(false);

  // ── Export ────────────────────────────────────────────────────────────────
  readonly exporting = signal(false);

  readonly typeOptions: { label: string; value: string }[] = [
    { label: 'Todos os tipos',    value: ''                },
    { label: 'Centro de Custo',   value: 'centro_de_custo' },
    { label: 'Projeto',           value: 'projeto'         },
  ];

  typeLabel(type: string): string {
    return COST_CENTER_TYPE_LABELS[type] ?? type;
  }

  readonly pageSizeOptions = [10, 25, 50];

  readonly totalPages = computed(() => this.store.totalPages());

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

  // ── Export ────────────────────────────────────────────────────────────────

  onExport(): void {
    this.exporting.set(true);
    this.svc.exportExcel().subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = 'projetos-centros-custo.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  // ── Modal handlers ────────────────────────────────────────────────────────

  onView(item: CostCenter): void {
    this.selectedItem.set(item);
    this.showModal.set(true);
  }

  onEdit(item: CostCenter): void {
    this.selectedItem.set(item);
    this.showModal.set(true);
  }

  onModalClose(): void {
    this.showModal.set(false);
    this.selectedItem.set(null);
  }

  onModalSaved(_updated: CostCenter): void {
    // Recarrega do servidor (fonte da verdade) em vez de aplicar patch client-side:
    // a resposta do PATCH nem sempre traz a relação de hierarquia (costCenterId /
    // parentProjectId / _entityType) completa, o que reclassificava o registro
    // editado e o duplicava/deslocava na árvore. O reload mantém a expansão atual.
    this.store.load();
    this.showModal.set(false);
    this.selectedItem.set(null);
  }

  onModalDeleted(id: number): void {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    const item = this.selectedItem();
    this.showModal.set(false);
    this.selectedItem.set(null);
    if (item) this.store.deleteById(id, resolveEntityType(item));
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setName(value), 400);
  }

  onDelete(item: CostCenter): void {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    this.store.deleteById(item.id, resolveEntityType(item));
  }

  getSortState(col: keyof CostCenter): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  toStr(id: number): string { return String(id); }

  trackById(_: number, item: CostCenter): number { return item.id; }
}