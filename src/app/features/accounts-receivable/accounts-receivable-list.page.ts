// src/app/features/accounts-receivable/accounts-receivable-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AccountsReceivableStore } from './accounts-receivable.store';
import { AccountsReceivableService } from './accounts-receivable.service';
import { ReceivableAccount, ReceivableFilters } from './accounts-receivable.model';
import { BaixaModalComponent, BaixaResult } from '../../shared/components/baixa-modal/baixa-modal.component';
import { RenegotiateModalComponent, RenegotiateResult } from '../../shared/components/renegotiate-modal/renegotiate-modal.component';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-accounts-receivable-list',
  standalone: true,
  imports: [FormsModule, NgClass, BaixaModalComponent, RenegotiateModalComponent],
  providers: [AccountsReceivableStore],
  templateUrl: './accounts-receivable-list.page.html',
  styleUrl: './accounts-receivable-list.page.scss',
})
export class AccountsReceivableListPage implements OnInit {
  readonly store = inject(AccountsReceivableStore);
  private svc    = inject(AccountsReceivableService);
  private notify = inject(NotificationService);

  // FIN-01: baixa (recebimento) total ou parcial.
  readonly rcvItem = signal<ReceivableAccount | null>(null);
  readonly rcvBusy = signal(false);

  openReceive(item: ReceivableAccount): void { this.rcvItem.set(item); }
  closeReceive(): void { this.rcvItem.set(null); }

  onReceiveConfirm(r: BaixaResult): void {
    const item = this.rcvItem();
    if (!item) return;
    this.rcvBusy.set(true);
    this.svc.registerReceipt(Number(item.id), { amount: r.amount, receiptDate: r.date, note: r.note }).subscribe({
      next: () => { this.rcvBusy.set(false); this.rcvItem.set(null); this.notify.success('Recebimento registrado com sucesso.'); this.store.load(); },
      error: err => { this.rcvBusy.set(false); this.notify.error(err?.error?.message ?? 'Falha ao registrar o recebimento.'); },
    });
  }

  // FIN-03: renegociação.
  readonly rngItem = signal<ReceivableAccount | null>(null);
  readonly rngBusy = signal(false);
  openRenegotiate(item: ReceivableAccount): void { this.rngItem.set(item); }
  closeRenegotiate(): void { this.rngItem.set(null); }
  onRenegotiateConfirm(r: RenegotiateResult): void {
    const item = this.rngItem();
    if (!item) return;
    this.rngBusy.set(true);
    this.svc.renegotiate(Number(item.id), r).subscribe({
      next: () => { this.rngBusy.set(false); this.rngItem.set(null); this.notify.success('Título renegociado — novo título gerado.'); this.store.load(); },
      error: err => { this.rngBusy.set(false); this.notify.error(err?.error?.message ?? 'Falha ao renegociar.'); },
    });
  }

  ngOnInit(): void {
    this.store.load();
  }

  readonly viewOptions = [
    { label: 'Captura de Nota Fiscal', value: 'CAPTURA_NF' },
    { label: 'Lançamentos', value: 'LANCAMENTOS' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  localFilters: ReceivableFilters = {
    status: '', dateRange: '', contractor: ''
  };

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

  openFilters() {
    this.localFilters = { ...this.store.filters() };
    this.store.toggleFilterModal(true);
  }

  closeFilters() {
    this.store.toggleFilterModal(false);
  }

  clearFilters() {
    this.store.clearFilters();
    this.localFilters = { ...this.store.filters() };
  }

  applyFilters() {
    this.store.applyFilters({ ...this.localFilters });
  }

  getSortState(col: keyof ReceivableAccount): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  onDelete(item: ReceivableAccount) {
    if (!confirm('Excluir esta conta a receber? Esta ação não pode ser desfeita.')) return;
    this.store.deleteOne(item.id);
  }

  onDeleteSelected() {
    const n = this.store.selectedCount();
    if (!n) return;
    if (!confirm(`Excluir ${n} conta(s) a receber selecionada(s)? Esta ação não pode ser desfeita.`)) return;
    this.store.deleteSelected();
  }
}