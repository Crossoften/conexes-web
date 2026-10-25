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

/** CB-05 / I061: uma célula da grade do calendário de intervalo. */
interface DiaCalendario {
  iso: string; dia: number; noMes: boolean;
  inicio: boolean; fim: boolean; entre: boolean; hoje: boolean;
}
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const dois = (n: number) => String(n).padStart(2, '0');
function paraIso(d: Date): string { return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`; }
function deIso(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function primeiroDoMes(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }

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

  /**
   * CB-05/I061: "Personalizado" saiu da lista. Ele era uma ETAPA — escolher
   * Personalizado só para então o calendário aparecer —, e o pedido diz que não
   * há etapa de período personalizado. O calendário de intervalo fica sempre
   * visível ao lado; estes valores continuam como atalhos de um clique.
   */
  readonly periodOptions = [
    { label: 'Todo o período', value: '' },
    { label: 'Este mês', value: 'THIS_MONTH' },
    { label: 'Mês passado', value: 'LAST_MONTH' },
    { label: 'Últimos 90 dias', value: 'LAST_90' },
    { label: 'Este ano', value: 'THIS_YEAR' },
  ];

  /**
   * CB-05/I061: escolher um atalho descarta o intervalo marcado no calendário —
   * senão o botão continuaria exibindo "01/10 a 15/10" enquanto a lista já mostra
   * "Este mês", e o rótulo mentiria sobre o que está filtrado.
   */
  aoEscolherAtalho(valor: string): void {
    this.inicioSel.set('');
    this.fimSel.set('');
    this.store.setCustomStart('');
    this.store.setCustomEnd('');
    this.store.setPeriod(valor);
    this.calendarioAberto.set(false);
  }

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

  // ── CB-09 / I065: importar extrato OFX/Excel ──────────────────────────────
  onImportarExtrato(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.store.importarExtrato(file);
    // Limpa para permitir reenviar o MESMO arquivo (é assim que se vê a regra de duplicata).
    input.value = '';
  }

  // ── CB-05 / I061: um calendário único de intervalo ────────────────────────
  // Eram dois <input type="date"> soltos ("Data inicial" e "Data final"), e o cliente
  // pediu um calendário só, de intervalo. Não há biblioteca de calendário no projeto
  // (sem Material, sem date-fns), então a grade é feita aqui: o primeiro clique marca
  // o início, o segundo o fim, e o período só é aplicado quando o intervalo fecha.
  readonly diasSemana = DIAS_SEMANA;
  readonly calendarioAberto = signal(false);
  readonly mesVisivel = signal<Date>(primeiroDoMes(new Date()));
  readonly inicioSel = signal<string>('');
  readonly fimSel = signal<string>('');

  abrirCalendario(): void {
    if (this.calendarioAberto()) { this.calendarioAberto.set(false); return; }
    const f = this.store.filters();
    this.inicioSel.set(f.customStart ?? '');
    this.fimSel.set(f.customEnd ?? '');
    this.mesVisivel.set(primeiroDoMes(f.customStart ? deIso(f.customStart) : new Date()));
    this.calendarioAberto.set(true);
  }

  mesAnterior(): void { const m = this.mesVisivel(); this.mesVisivel.set(new Date(m.getFullYear(), m.getMonth() - 1, 1)); }
  mesProximo(): void { const m = this.mesVisivel(); this.mesVisivel.set(new Date(m.getFullYear(), m.getMonth() + 1, 1)); }

  readonly rotuloMes = computed(() => `${MESES[this.mesVisivel().getMonth()]} ${this.mesVisivel().getFullYear()}`);

  /** Grade de 6 semanas, com os dias vizinhos em cinza, para o mês visível. */
  readonly diasDoMes = computed((): DiaCalendario[] => {
    const base = this.mesVisivel();
    const hoje = paraIso(new Date());
    const ini = this.inicioSel(), fim = this.fimSel();
    const primeiraCelula = new Date(base.getFullYear(), base.getMonth(), 1 - base.getDay());
    const celulas: DiaCalendario[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(primeiraCelula.getFullYear(), primeiraCelula.getMonth(), primeiraCelula.getDate() + i);
      const s = paraIso(d);
      celulas.push({
        iso: s, dia: d.getDate(), noMes: d.getMonth() === base.getMonth(),
        inicio: !!ini && s === ini, fim: !!fim && s === fim,
        entre: !!ini && !!fim && s > ini && s < fim, hoje: s === hoje,
      });
    }
    return celulas;
  });

  /** Primeiro clique = início (zera o fim); segundo = fim, invertendo se vier antes. */
  clicarDia(iso: string): void {
    const ini = this.inicioSel(), fim = this.fimSel();
    if (!ini || fim) { this.inicioSel.set(iso); this.fimSel.set(''); return; }
    if (iso < ini) { this.fimSel.set(ini); this.inicioSel.set(iso); } else { this.fimSel.set(iso); }
    this.aplicarIntervalo();
  }

  private aplicarIntervalo(): void {
    const ini = this.inicioSel(), fim = this.fimSel();
    if (!ini || !fim) return;
    this.store.setCustomStart(ini);
    this.store.setCustomEnd(fim);
    this.store.setPeriod('CUSTOM');
    this.calendarioAberto.set(false);
  }

  limparIntervalo(): void {
    this.inicioSel.set(''); this.fimSel.set('');
    this.store.setCustomStart(''); this.store.setCustomEnd('');
    this.store.setPeriod('');
    this.calendarioAberto.set(false);
  }

  readonly rotuloIntervalo = computed(() => {
    const f = this.store.filters();
    if (f.customStart && f.customEnd) return `${this.dataBR(f.customStart)} a ${this.dataBR(f.customEnd)}`;
    if (f.customStart) return `${this.dataBR(f.customStart)} — escolha a data final`;
    return 'Escolher intervalo';
  });

  // Formatação local (o componente não importa pipes).
  private readonly fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  dinheiro(v?: number | null): string { return this.fmtBRL.format(v ?? 0); }
  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
}