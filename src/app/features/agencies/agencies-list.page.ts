// src/app/features/agencies/agencies-list.page.ts
import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AgenciesStore } from './agencies.store';
import { AgenciesService } from './agencies.service';
import { Agency, AgencyUpdatePayload, AGENCY_STATUS_CONFIG } from './agencies.model';
import { AgencyDetailModalComponent } from './components/agencies-detail.modal';

@Component({
  selector: 'app-agencies-list',
  standalone: true,
  imports: [FormsModule, NgClass, NgIf, RouterLink, AgencyDetailModalComponent],
  providers: [AgenciesStore],
  templateUrl: './agencies-list.page.html',
  styleUrl: './agencies-list.page.scss',
})
export class AgenciesListPage implements OnInit {
  readonly store        = inject(AgenciesStore);
  private readonly svc  = inject(AgenciesService);
  readonly statusConfig = AGENCY_STATUS_CONFIG;

  // ORG-INATIV: rótulo e variante do status para exibir badge na listagem.
  statusLabel(s: string | undefined): string { return this.statusConfig[s ?? 'Active']?.label ?? (s ?? '—'); }
  statusVariant(s: string | undefined): string { return this.statusConfig[s ?? 'Active']?.variant ?? 'neutral'; }

  // ── Modal ─────────────────────────────────────────────────────────────────
  readonly selectedAgency = signal<Agency | null>(null);
  readonly showModal      = signal(false);
  readonly modalLoading   = signal(false);
  readonly modalMode      = signal<'view' | 'edit'>('view');

  readonly statusOptions = [
    { label: 'Selecione o status', value: ''         },
    { label: 'Ativo',              value: 'Active'   },
    { label: 'Pendente',           value: 'Pending'  },
    { label: 'Inativo',            value: 'Inactive' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.store.total() / this.store.pagination().pageSize))
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

  // ── Search debounce ───────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  // ── Sort ──────────────────────────────────────────────────────────────────

  getSortState(col: keyof Agency): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── Modal handlers ────────────────────────────────────────────────────────

  onView(item: Agency): void {
    this.openModal(item, 'view');
  }

  onEdit(item: Agency): void {
    this.openModal(item, 'edit');
  }

  /** Abre o modal com o item da lista (para o header) e, em seguida, carrega o
   *  registro completo via GET /{id} — a projeção da listagem pode não trazer
   *  todos os campos (ex.: CEP e Número). */
  private openModal(item: Agency, mode: 'view' | 'edit' = 'view'): void {
    this.modalMode.set(mode);
    this.selectedAgency.set(item);
    this.showModal.set(true);
    this.modalLoading.set(true);
    this.store.loadOne(item.id,
      full => {
        this.selectedAgency.set(full);
        this.modalLoading.set(false);
      },
      () => this.modalLoading.set(false),
    );
  }

  onCloseModal(): void {
    this.showModal.set(false);
    this.selectedAgency.set(null);
  }

  onSaved(payload: AgencyUpdatePayload): void {
    const id = this.selectedAgency()?.id;
    if (!id) return;
    this.modalLoading.set(true);
    this.store.update(id, payload,
      () => {
        this.modalLoading.set(false);
        this.onCloseModal();
      },
      () => {
        this.modalLoading.set(false);
      }
    );
  }

  onDeactivate(id: number): void {
    const confirmed = window.confirm('Deseja desativar este órgão concessor?');
    if (!confirmed) return;
    this.store.deactivate(id,
      () => this.onCloseModal(),
    );
  }

  /** 🌐 Portal da Transparência — abre a página pública do órgão (link auto-gerado, CV-02). */
  onTransparency(item: Agency): void {
    window.open(this.svc.buildTransparencyUrl(item.id), '_blank');
  }

  // ── Export ────────────────────────────────────────────────────────────────

  onExport(): void {
    this.store.exportExcel();
  }

  trackById(_: number, item: Agency): number { return item.id; }
}