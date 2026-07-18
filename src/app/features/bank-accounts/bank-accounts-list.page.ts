// src/app/features/bank-accounts/bank-accounts-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BankAccountsStore } from './bank-accounts.store';
import { BankPayload, BankAccountPayload } from './bank-accounts.model';
import { BankAccountDetailModalComponent } from './components/bank-account-detail.modal';

@Component({
  selector: 'app-bank-accounts-list',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, BankAccountDetailModalComponent],
  providers: [BankAccountsStore],
  templateUrl: './bank-accounts-list.page.html',
  styleUrl: './bank-accounts-list.page.scss',
})
export class BankAccountsListPage implements OnInit {
  readonly store = inject(BankAccountsStore);

  readonly typeOptions: { label: string; value: string }[] = [
    { label: 'Selecione o tipo', value: ''         },
    { label: 'Conta Corrente',   value: 'Checking' },
    { label: 'Conta Poupança',   value: 'Savings'  },
    { label: 'Conta Salário',    value: 'Salary'   },
    { label: 'Conta Pagamento',  value: 'Payment'  },
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

  // ── Bank form (modal criar/editar banco) ──────────────────────────────────

  readonly bankForm = signal<BankPayload>({ name: '', code: '' });

  openCreateBank(): void {
    this.bankForm.set({ name: '', code: '' });
    this.store.openCreateBank();
  }

  openEditBank(bank: any): void {
    this.bankForm.set({ name: bank.name, code: bank.code });
    this.store.openEditBank(bank);
  }

  openViewBank(bank: any): void {
    this.bankForm.set({ name: bank.name, code: bank.code });
    this.store.openViewBank(bank);
  }

  onBankFormChange(field: keyof BankPayload, value: string): void {
    this.bankForm.update(f => ({ ...f, [field]: value }));
  }

  submitBankForm(): void {
    const { name, code } = this.bankForm();
    if (!name.trim() || !code.trim()) return;
    this.store.saveBank(this.bankForm());
  }

  // ── Account detail modal handlers ─────────────────────────────────────────

  onAccountSave(payload: BankAccountPayload): void {
    this.store.saveAccount(payload);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.store.load();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: string): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...'): void {
    if (typeof p === 'number') this.store.setPage(p);
  }

  toStr(id: number): string { return String(id); }
}
