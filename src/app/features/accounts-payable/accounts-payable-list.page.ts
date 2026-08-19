// src/app/features/accounts-payable/accounts-payable-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AccountsPayableStore } from './accounts-payable.store';
import { AccountsPayableService } from './accounts-payable.service';
import { PayableAccount, AdvancedFilters } from './accounts-payable.model';
import { RouterLink } from "@angular/router";
import { BaixaModalComponent, BaixaResult } from '../../shared/components/baixa-modal/baixa-modal.component';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-accounts-payable-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, BaixaModalComponent],
  providers: [AccountsPayableStore],
  templateUrl: './accounts-payable-list.page.html',
  styleUrl: './accounts-payable-list.page.scss',
})
export class AccountsPayableListPage implements OnInit {
  readonly store = inject(AccountsPayableStore);
  private svc    = inject(AccountsPayableService);
  private notify = inject(NotificationService);

  // FIN-01: baixa (pagamento) total ou parcial.
  readonly payItem = signal<PayableAccount | null>(null);
  readonly payBusy = signal(false);

  openPay(item: PayableAccount): void { this.payItem.set(item); }
  closePay(): void { this.payItem.set(null); }

  onBaixaConfirm(r: BaixaResult): void {
    const item = this.payItem();
    if (!item) return;
    this.payBusy.set(true);
    this.svc.registerPayment(Number(item.id), { amount: r.amount, paymentDate: r.date, note: r.note }).subscribe({
      next: () => { this.payBusy.set(false); this.payItem.set(null); this.notify.success('Baixa registrada com sucesso.'); this.store.load(); },
      error: err => { this.payBusy.set(false); this.notify.error(err?.error?.message ?? 'Falha ao registrar a baixa.'); },
    });
  }

  ngOnInit(): void {
    this.store.load();
  }

  readonly viewOptions = [
    { label: 'Lançamentos', value: 'LANÇAMENTOS' },
    { label: 'Visão 2', value: 'VISA0_2' },
  ];

  readonly pageSizeOptions = [10, 25, 50];

  // Estado local para os inputs do modal antes de aplicar
  localFilters: AdvancedFilters = {
    issue: '', status: '', dateRange: '', supplier: '', remittanceStatus: '', expenseType: '',
    paymentType: '', contract: '', requisition: '', writeOffAccount: '', payingAccount: '',
    categoryAccount: '', costCenter: '', subProject: ''
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
    this.localFilters = { ...this.store.filters() }; // Copia os filtros atuais
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

  getSortState(col: keyof PayableAccount): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── Ações de linha e em lote ────────────────────────────────────────────────

  onDelete(item: PayableAccount) {
    if (!confirm(`Excluir o lançamento ${item.displayId ?? item.id}? Esta ação não pode ser desfeita.`)) return;
    this.store.deleteOne(item.id);
  }

  onCopy(item: PayableAccount) {
    this.store.copyOne(item.id);
  }

  onSendToRemittance(item: PayableAccount) {
    this.store.sendToRemittance(item.id);
  }

  onDeleteSelected() {
    const n = this.store.selectedCount();
    if (!n) return;
    if (!confirm(`Excluir ${n} lançamento(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    this.store.deleteSelected();
  }

  // Modal: multiplicar (gera parcelas)
  readonly multiplyTarget = signal<PayableAccount | null>(null);
  multiplyTimes = 2;
  multiplyInterval = 30;

  openMultiply(item: PayableAccount) {
    this.multiplyTimes = 2;
    this.multiplyInterval = 30;
    this.multiplyTarget.set(item);
  }
  closeMultiply() { this.multiplyTarget.set(null); }
  confirmMultiply() {
    const item = this.multiplyTarget();
    if (!item) return;
    const times = Math.max(2, Math.floor(this.multiplyTimes));
    const interval = Math.max(0, Math.floor(this.multiplyInterval));
    this.store.multiplyOne(item.id, times, interval);
    this.closeMultiply();
  }

  // Modal: alterar vencimento em lote
  readonly bulkDateOpen = signal(false);
  bulkDate = '';

  openBulkDate() {
    if (!this.store.selectedCount()) return;
    this.bulkDate = '';
    this.bulkDateOpen.set(true);
  }
  closeBulkDate() { this.bulkDateOpen.set(false); }
  confirmBulkDate() {
    if (!this.bulkDate) return;
    this.store.bulkDueDate(this.bulkDate);
    this.closeBulkDate();
  }
}