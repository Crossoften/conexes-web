// src/app/features/bank-reconciliation/bank-reconciliation.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { BankReconciliationStore } from './bank-reconciliation.store';
import { ReconciliationItem } from './bank-reconciliation.model';
import { LedgerCandidate } from './bank-reconciliation.service';

/** CB-03/CB-10/CB-13: estado do formulário de uma pendência aberta. */
interface PendenciaForm {
  description: string;
  category: string;
  stakeholderId: string;
  costCenterId: string;
  busca: string;          // texto da busca de título (CB-10)
  vinculo: string;        // 'payable:12' | 'receivable:7' | ''
  vinculoRotulo: string;
}
const FORM_VAZIO: PendenciaForm = { description: '', category: '', stakeholderId: '', costCenterId: '', busca: '', vinculo: '', vinculoRotulo: '' };

@Component({
  selector: 'app-bank-reconciliation',
  standalone: true,
  imports: [FormsModule, NgClass],
  providers: [BankReconciliationStore],
  templateUrl: './bank-reconciliation.page.html',
  styleUrl: './bank-reconciliation.page.scss',
})
export class BankReconciliationPage implements OnInit {
  readonly store = inject(BankReconciliationStore);
  private router = inject(Router);

  // CB-11: abrir o cadastro correspondente a partir da conciliação.
  goNewEntry(): void { this.router.navigate(['/financial-transfers/new-entry']); }
  goNewTransfer(): void { this.router.navigate(['/financial-transfers/new']); }

  ngOnInit(): void {
    this.store.load();
  }

  readonly periodOptions = [
    { label: 'Todo o período', value: '' },
    { label: 'Este mês', value: 'THIS_MONTH' },
    { label: 'Mês passado', value: 'LAST_MONTH' },
    { label: 'Últimos 90 dias', value: 'LAST_90' },
    { label: 'Este ano', value: 'THIS_YEAR' },
    { label: 'Personalizado', value: 'CUSTOM' },
  ];

  readonly typeOptions = [
    { label: 'Selecione o tipo', value: '' },
    { label: 'Crédito', value: 'CREDIT' },
    { label: 'Débito', value: 'DEBIT' },
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

  private globalSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private itemSearchTimer: ReturnType<typeof setTimeout> | null = null;

  onGlobalSearch(value: string) {
    if (this.globalSearchTimer) clearTimeout(this.globalSearchTimer);
    this.globalSearchTimer = setTimeout(() => this.store.setGlobalSearch(value), 400);
  }

  onItemSearch(value: string) {
    if (this.itemSearchTimer) clearTimeout(this.itemSearchTimer);
    this.itemSearchTimer = setTimeout(() => this.store.setItemSearch(value), 400);
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  // ── CB-03 / CB-10 / CB-12 / CB-13: painel da pendência ────────────────────
  // Era um mockup: campos sem ligação, seletores só com "Selecione" e os botões
  // Ignorar/Conciliar sem handler. O formulário abre preenchido com os dados da
  // própria movimentação (CB-03) e os botões agora persistem (CB-13).

  readonly form = signal<Record<string, PendenciaForm>>({});

  /** Abre/fecha a pendência; ao abrir, semeia o formulário com os dados do movimento. */
  onToggle(item: ReconciliationItem): void {
    const atual = this.form();
    if (!atual[item.id]) {
      this.form.set({
        ...atual,
        [item.id]: {
          ...FORM_VAZIO,
          description: item.description ?? '',
          category: item.category ?? '',
          stakeholderId: item.stakeholderId ? String(item.stakeholderId) : '',
          costCenterId: item.costCenterId ? String(item.costCenterId) : '',
        },
      });
    }
    this.store.limparCandidatos();
    this.store.toggleExpand(item.id);
  }

  campo(item: ReconciliationItem, nome: keyof PendenciaForm): string {
    return this.form()[item.id]?.[nome] ?? '';
  }

  setCampo(item: ReconciliationItem, nome: keyof PendenciaForm, valor: string): void {
    const atual = this.form();
    this.form.set({ ...atual, [item.id]: { ...(atual[item.id] ?? FORM_VAZIO), [nome]: valor } });
  }

  /**
   * CB-10: com texto digitado, busca pelo TEXTO; com o campo vazio, busca pelo VALOR
   * do próprio movimento. Mandar os dois juntos é um E no servidor e deixaria a busca
   * quase sempre vazia — a descrição do extrato raramente é igual à do título.
   */
  buscar(item: ReconciliationItem, termo: string): void {
    const t = (termo ?? '').trim();
    if (t) this.store.buscarCandidatos(t);
    else this.store.buscarCandidatos('', item.rawValue != null ? Math.abs(item.rawValue) : undefined);
  }

  escolherCandidato(item: ReconciliationItem, c: LedgerCandidate): void {
    const rotulo = `${c.type === 'payable' ? 'Conta a pagar' : 'Conta a receber'} #${c.id}${c.description ? ' — ' + c.description : ''}`;
    this.setCampo(item, 'vinculo', `${c.type}:${c.id}`);
    this.setCampo(item, 'vinculoRotulo', rotulo);
    this.store.limparCandidatos();
  }

  conciliar(item: ReconciliationItem): void {
    if (!item.txId) return;
    const f = this.form()[item.id] ?? FORM_VAZIO;
    const [tipo, idStr] = (f.vinculo || '').split(':');
    const vinculoId = Number(idStr) || undefined;
    this.store.conciliar(item.txId, {
      ...(f.description ? { description: f.description } : {}),
      ...(f.category ? { category: f.category } : {}),
      ...(f.stakeholderId ? { stakeholderId: Number(f.stakeholderId) } : {}),
      ...(f.costCenterId ? { costCenterId: Number(f.costCenterId) } : {}),
      ...(tipo === 'payable' && vinculoId ? { accountPayableId: vinculoId } : {}),
      ...(tipo === 'receivable' && vinculoId ? { accountReceivableId: vinculoId } : {}),
    }, f.vinculoRotulo || undefined);
  }

  ignorar(item: ReconciliationItem): void {
    if (item.txId) this.store.ignorar(item.txId);
  }

  // Formatação local (o componente não importa pipes).
  private readonly fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  dinheiro(v?: number | null): string { return this.fmtBRL.format(v ?? 0); }
  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
}