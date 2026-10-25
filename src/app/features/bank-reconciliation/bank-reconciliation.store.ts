// src/app/features/bank-reconciliation/bank-reconciliation.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { ReconciliationItem, ReconciliationTab, BankAccountInfo, ConciliationSummary } from './bank-reconciliation.model';
import {
  BankReconciliationService, ReconAccount, AccountReconciliation, LedgerCandidate,
  AutoRule, AutoResult, ImportBatch, StatementImportResult,
} from './bank-reconciliation.service';
import { PurchasesService } from '../purchases/purchases.service';
import { NotificationService } from '../../shared/services/notification.service';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const WEEKDAY = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
// FIN-N03: o extrato guarda datas civis (meia-noite UTC). Lidas no fuso do
// navegador (UTC−3) o dia e o dia-da-semana recuavam um dia — 18/10 saía 17/10.
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
function weekday(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : WEEKDAY[d.getUTCDay()];
}

/**
 * CB-06 / I062 — o recorte é por DATA CIVIL, não por instante.
 *
 * O extrato grava datas civis à meia-noite UTC e a tela mostra exatamente essa data
 * (ver `fmtDate`, que formata com timeZone UTC). Comparar instantes quebrava o
 * limite: o fim do dia 02/10 em America/Sao_Paulo é 03/10 02:59:59Z, então um
 * movimento gravado em `2026-10-03T00:00:00.000Z` — que a tela exibe como 03/10 —
 * entrava num intervalo 01–02/10. Era exatamente o caso relatado: o crédito de
 * R$ 5.000 de 03/10 aparecia junto do débito de R$ 15.000 de 02/10.
 *
 * Agora o intervalo é um par de datas civis (AAAA-MM-DD), que ordenam corretamente
 * como texto, e os atalhos ancoram no "hoje" de quem usa — a data civil em
 * São Paulo —, não no fuso do servidor nem no do navegador.
 */
const diaCivil = (iso?: string | null): string => (iso ?? '').slice(0, 10);

const ymd = (a: number, m: number, d: number) =>
  `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Último dia do mês (m = 1..12), contado em UTC para não escorregar de fuso. */
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Hoje na data civil de São Paulo — o "hoje" de quem usa o sistema. */
function hojeSP(): { ano: number; mes: number; dia: number } {
  const txt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const [ano, mes, dia] = txt.split('-').map(Number);
  return { ano, mes, dia };
}

const DATA_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

/** Intervalo [start, end] de datas civis, INCLUSIVO nas duas pontas. */
function periodRange(period: string, customStart: string, customEnd: string): { start: string | null; end: string | null } {
  const { ano, mes, dia } = hojeSP();
  switch (period) {
    case 'THIS_MONTH': return { start: ymd(ano, mes, 1), end: ymd(ano, mes, ultimoDia(ano, mes)) };
    case 'LAST_MONTH': {
      const a = mes === 1 ? ano - 1 : ano;
      const m = mes === 1 ? 12 : mes - 1;
      return { start: ymd(a, m, 1), end: ymd(a, m, ultimoDia(a, m)) };
    }
    case 'LAST_90': {
      const b = new Date(Date.UTC(ano, mes - 1, dia) - 90 * 864e5);
      return { start: ymd(b.getUTCFullYear(), b.getUTCMonth() + 1, b.getUTCDate()), end: ymd(ano, mes, dia) };
    }
    case 'THIS_YEAR':  return { start: ymd(ano, 1, 1), end: ymd(ano, 12, 31) };
    case 'CUSTOM': return {
      start: DATA_CIVIL.test(customStart) ? customStart : null,
      end: DATA_CIVIL.test(customEnd) ? customEnd : null,
    };
    default: return { start: null, end: null }; // '' / ALL = sem filtro
  }
}

const EMPTY_ACCOUNT: BankAccountInfo = { bankName: '—', agency: '—', account: '—', balance: 'R$ 0,00' };

interface State {
  accounts: ReconAccount[];
  selectedAccountId: number | null;
  pendingItems: ReconciliationItem[];
  movementItems: ReconciliationItem[];
  accountInfo: BankAccountInfo;
  loading: boolean;
  error: string | null;
  activeTab: ReconciliationTab;
  filters: { globalSearch: string; period: string; type: string; itemSearch: string; customStart: string; customEnd: string };
  pagination: { page: number; pageSize: number };
  expandedIds: Set<string>;
  expandedInnerIds: Set<string>; // Gerencia a expansão das sub-tabelas em Movimentações
}

@Injectable()
export class BankReconciliationStore {
  private readonly svc = inject(BankReconciliationService);
  private readonly lookups = inject(PurchasesService);
  private readonly notify = inject(NotificationService);

  private readonly state = signal<State>({
    accounts: [],
    selectedAccountId: null,
    pendingItems: [],
    movementItems: [],
    accountInfo: EMPTY_ACCOUNT,
    loading: false,
    error: null,
    activeTab: 'PENDING',
    filters: { globalSearch: '', period: '', type: '', itemSearch: '', customStart: '', customEnd: '' },
    pagination: { page: 1, pageSize: 10 },
    expandedIds: new Set(),
    expandedInnerIds: new Set(),
  });

  // Carrega as contas e a conciliação da primeira conta (ou vazio se não houver conta).
  load(): void {
    this.state.update(s => ({ ...s, loading: true, error: null }));
    this.carregarLookups();   // CB-12: os seletores do painel da pendência
    this.svc.getAccounts().subscribe({
      next: accounts => {
        this.state.update(s => ({ ...s, accounts }));
        if (!accounts.length) {
          this.state.update(s => ({ ...s, loading: false, accountInfo: EMPTY_ACCOUNT, pendingItems: [], movementItems: [] }));
          return;
        }
        this.selectAccount(accounts[0].id);
      },
      error: () => this.state.update(s => ({ ...s, loading: false, error: 'Não foi possível carregar a conciliação.' })),
    });
  }

  selectAccount(bankAccountId: number): void {
    this.state.update(s => ({ ...s, loading: true, selectedAccountId: bankAccountId, expandedIds: new Set(), expandedInnerIds: new Set() }));
    this.svc.getAccountReconciliation(bankAccountId).subscribe({
      next: data => this.state.update(s => ({ ...s, ...this.mapReconciliation(data), loading: false })),
      error: () => this.state.update(s => ({ ...s, loading: false, error: 'Não foi possível carregar a conta.' })),
    });
  }

  private mapReconciliation(data: AccountReconciliation): Partial<State> {
    const accInfo: BankAccountInfo = {
      bankName: data.account.name, agency: `Ag. ${data.account.agency}`,
      account: `C/C ${data.account.account}`, balance: brl.format(data.account.balance ?? 0),
    };
    const pendingItems: ReconciliationItem[] = (data.pendingReconciliations ?? []).map(p => ({
      id: `p-${p.id}`, date: fmtDate(p.date), dayOfWeek: weekday(p.date), rawDate: p.date,
      // CB-03/I060: a descrição é a da PRÓPRIA movimentação. O texto fixo "Lançamento
      // pendente de conciliação" saía em toda linha — era o que o relatório apontou
      // como pendência genérica, sem os dados do lançamento.
      description: (p.description ?? '').trim() || 'Movimentação sem descrição no extrato',
      amount: brl.format(p.value ?? 0),
      bankDetails: accInfo,
      txId: p.id,
      rawValue: p.value ?? 0,
      type: p.type,
      category: p.category ?? null,
      stakeholderId: p.stakeholderId ?? null,
      costCenterId: p.costCenterId ?? null,
      reconciled: false,
    }));
    const movementItems: ReconciliationItem[] = (data.movements ?? []).map(m => ({
      id: `m-${m.id}`, date: fmtDate(m.date), dayOfWeek: weekday(m.date), rawDate: m.date,
      description: m.bankDescription ?? '—', amount: brl.format(m.bankValue ?? 0),
      txId: m.id, rawValue: m.bankValue ?? 0, type: m.type, reconciled: m.reconciled,
      movementGroups: [{
        id: `g-${m.id}`,
        groupName: m.reconciled ? 'Conciliado' : 'Pendente',
        totalValConexes: m.conexosValue != null ? brl.format(m.conexosValue) : '—',
        groupDescBank: m.bankDescription ?? '—',
        totalValBank: brl.format(m.bankValue ?? 0),
        conciliationType: m.reconciled ? 'Manual/Automática' : 'Não conciliado',
        subItems: [{
          id: `s-${m.id}`,
          descConexes: m.conexosDescription ?? (m.stakeholder ?? '—'),
          valConexes: m.conexosValue != null ? brl.format(m.conexosValue) : '—',
          descBank: m.bankDescription ?? '—',
          valBank: brl.format(m.bankValue ?? 0),
        }],
      }],
    }));
    // CB-06/I062: os cards NÃO são calculados aqui. Eram somados sobre o conjunto
    // inteiro da conta e por isso ignoravam o período — um intervalo sem movimento
    // continuava exibindo o total da conta. Agora derivam do que o período deixou
    // passar (ver o computed `summaries`).
    return { accountInfo: accInfo, pendingItems, movementItems };
  }

  /**
   * CB-06: aplica o período selecionado a uma lista de itens, comparando DATAS CIVIS
   * (AAAA-MM-DD) — as mesmas que a tela mostra. Os dois limites são inclusivos: num
   * intervalo 01–02/10 entram os movimentos de 01/10 e de 02/10, e só eles.
   */
  private noPeriodo(items: ReconciliationItem[]): ReconciliationItem[] {
    const f = this.filters();
    const { start, end } = periodRange(f.period, f.customStart, f.customEnd);
    if (!start && !end) return items;
    return items.filter(item => {
      const d = diaCivil(item.rawDate);
      if (!DATA_CIVIL.test(d)) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  private creditoDebito(items: ReconciliationItem[]): { credit: string; debit: string } {
    const soma = (t: string) => items
      .filter(i => (i.type ?? '') === t)
      .reduce((a, i) => a + Math.abs(i.rawValue ?? 0), 0);
    return { credit: brl.format(soma('Credit')), debit: brl.format(soma('Debit')) };
  }

  readonly accounts = computed(() => this.state().accounts);
  readonly selectedAccountId = computed(() => this.state().selectedAccountId);
  readonly error = computed(() => this.state().error);
  readonly loading = computed(() => this.state().loading);
  readonly activeTab = computed(() => this.state().activeTab);
  readonly accountInfo = computed(() => this.state().accountInfo);
  /**
   * CB-06 / I062 + CB-01 / I058: os cards saem do que o PERÍODO deixou passar, e o de
   * pendências leva a contagem. Antes somavam o conjunto inteiro da conta: um intervalo
   * sem movimento continuava mostrando "Pendente R$ 50.020". O Débito também vinha
   * sempre vazio — agora crédito e débito são separados.
   */
  readonly summaries = computed((): ConciliationSummary[] => {
    const conciliados = this.noPeriodo(this.state().movementItems).filter(i => i.reconciled);
    const pendentes = this.noPeriodo(this.state().pendingItems);
    return [
      { title: 'Conciliado', ...this.creditoDebito(conciliados), count: conciliados.length },
      { title: 'Pendente', ...this.creditoDebito(pendentes), count: pendentes.length },
    ];
  });
  readonly filters = computed(() => this.state().filters);
  readonly pagination = computed(() => this.state().pagination);
  readonly expandedIds = computed(() => this.state().expandedIds);
  readonly expandedInnerIds = computed(() => this.state().expandedInnerIds);

  readonly filteredItems = computed(() => {
    let result = this.state().activeTab === 'PENDING' ? this.state().pendingItems : this.state().movementItems;
    const f = this.filters();

    if (f.itemSearch) {
      const term = f.itemSearch.toLowerCase();
      result = result.filter(item =>
        item.date.includes(term) ||
        item.dayOfWeek.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term));
    }

    // CB-06/I062: o recorte por período da LISTA é o mesmo dos cards — uma só
    // implementação (`noPeriodo`). Havia aqui uma segunda cópia que comparava
    // instantes; lista e cards podiam discordar sobre o mesmo intervalo.
    return this.noPeriodo(result);
  });

  readonly filteredTotal = computed(() => this.filteredItems().length);

  readonly pageItems = computed(() => {
    const { page, pageSize } = this.pagination();
    const start = (page - 1) * pageSize;
    return this.filteredItems().slice(start, start + pageSize);
  });

  setTab(tab: ReconciliationTab) {
    this.state.update(s => ({ 
      ...s, activeTab: tab, expandedIds: new Set(), expandedInnerIds: new Set(), pagination: { ...s.pagination, page: 1 } 
    }));
  }

  setGlobalSearch(search: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, globalSearch: search } })); }
  setPeriod(period: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, period }, pagination: { ...s.pagination, page: 1 } })); }
  setCustomStart(d: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, customStart: d }, pagination: { ...s.pagination, page: 1 } })); }
  setCustomEnd(d: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, customEnd: d }, pagination: { ...s.pagination, page: 1 } })); }
  setType(type: string) { this.state.update(s => ({ ...s, filters: { ...s.filters, type }, pagination: { ...s.pagination, page: 1 } })); }
  
  setItemSearch(search: string) { 
    this.state.update(s => ({ ...s, filters: { ...s.filters, itemSearch: search }, pagination: { ...s.pagination, page: 1 } })); 
  }

  setPage(page: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, page } })); }
  setPageSize(pageSize: number) { this.state.update(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } })); }

  toggleExpand(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.expandedIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, expandedIds: newSet };
    });
  }

  toggleInnerExpand(id: string) {
    this.state.update(s => {
      const newSet = new Set(s.expandedInnerIds);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return { ...s, expandedInnerIds: newSet };
    });
  }

  // ───────── CB-10/CB-12/CB-13: o painel da pendência era um mockup estático ─────────
  // Os seletores tinham só "Selecione", o campo "Buscar lançamento" não tinha ligação
  // nenhuma e os botões Ignorar/Conciliar não tinham handler. Daqui para baixo é a
  // ligação desses controles ao serviço — que, no caso de buscar e conciliar, já existia.

  /** CB-12 / I068: fornecedores e centros de custo do cadastro para os seletores. */
  readonly fornecedores = signal<{ id: number; name: string }[]>([]);
  readonly centrosCusto = signal<{ id: number; name: string }[]>([]);

  /** CB-10 / I066: candidatos da busca de lançamento + o vínculo escolhido. */
  readonly candidatos = signal<LedgerCandidate[]>([]);
  readonly buscando = signal(false);
  readonly acaoBusy = signal<number | null>(null);
  readonly vinculoEscolhido = signal<{ txId: number; rotulo: string } | null>(null);

  carregarLookups(): void {
    this.lookups.getSuppliersLookup().subscribe({
      next: v => this.fornecedores.set((v as any[]).map(r => ({ id: r.id, name: r.name }))),
      error: () => this.fornecedores.set([]),
    });
    // Centro de custo só ANALÍTICO: o servidor recusa lançamento em conta sintética
    // (totalizadora), então oferecê-la seria uma opção que só devolve erro ao salvar.
    this.lookups.getCostCentersLookup().subscribe({
      next: v => this.centrosCusto.set(this.lookups.apenasAnaliticas(v as any).map((r: any) => ({ id: r.id, name: r.name }))),
      error: () => this.centrosCusto.set([]),
    });
  }

  /** CB-10: busca títulos de pagar/receber por descrição e/ou valor. */
  buscarCandidatos(termo: string, valor?: number): void {
    const t = (termo ?? '').trim();
    if (!t && valor == null) { this.candidatos.set([]); return; }
    this.buscando.set(true);
    this.svc.searchEntries({ ...(t ? { description: t } : {}), ...(valor != null ? { value: valor } : {}) }).subscribe({
      next: r => { this.candidatos.set([...(r.payables ?? []), ...(r.receivables ?? [])]); this.buscando.set(false); },
      error: () => { this.candidatos.set([]); this.buscando.set(false); this.notify.error('Não foi possível buscar lançamentos para conciliar.'); },
    });
  }
  limparCandidatos(): void { this.candidatos.set([]); }

  /** CB-13: concilia a pendência (com ou sem vínculo a um título) e recarrega a conta. */
  conciliar(
    txId: number,
    payload: { description?: string; category?: string; stakeholderId?: number; costCenterId?: number; accountPayableId?: number; accountReceivableId?: number },
    rotuloVinculo?: string,
  ): void {
    this.acaoBusy.set(txId);
    this.svc.match(txId, payload).subscribe({
      next: () => {
        this.acaoBusy.set(null);
        if (rotuloVinculo) this.vinculoEscolhido.set({ txId, rotulo: rotuloVinculo });
        this.candidatos.set([]);
        this.notify.success(rotuloVinculo ? `Movimento conciliado com ${rotuloVinculo}.` : 'Movimento conciliado.');
        const id = this.selectedAccountId();
        if (id) this.selectAccount(id);
      },
      error: err => { this.acaoBusy.set(null); this.notify.error(err?.error?.message ?? 'Não foi possível conciliar o movimento.'); },
    });
  }

  /** CB-13: ignora a pendência — sai da fila sem ser conciliada — e recarrega a conta. */
  ignorar(txId: number): void {
    this.acaoBusy.set(txId);
    this.svc.ignore(txId, true).subscribe({
      next: () => {
        this.acaoBusy.set(null);
        this.notify.success('Pendência ignorada: saiu da fila de conciliação.');
        const id = this.selectedAccountId();
        if (id) this.selectAccount(id);
      },
      error: err => { this.acaoBusy.set(null); this.notify.error(err?.error?.message ?? 'Não foi possível ignorar a pendência.'); },
    });
  }

  // ───────── CB-07 / CB-08 / CB-09: trazer o extrato e casar em lote ─────────

  /**
   * O período selecionado em ISO (yyyy-mm-dd), para mandar ao banco (CB-08).
   * CB-06/I062: `periodRange` já devolve datas civis nesse formato — não há mais
   * conversão de Date para texto no meio do caminho, que era por onde o dia
   * escorregava.
   */
  readonly periodoIso = computed((): { from?: string; to?: string } => {
    const f = this.filters();
    const { start, end } = periodRange(f.period, f.customStart, f.customEnd);
    return { ...(start ? { from: start } : {}), ...(end ? { to: end } : {}) };
  });

  /**
   * CB-07 / I063: o botão "Conciliar automaticamente" não tinha ação nenhuma e a tela
   * não dizia por qual regra o sistema casaria. Agora a regra é buscada e EXIBIDA antes,
   * e só depois do Executar o servidor concilia.
   */
  readonly regraAuto = signal<AutoRule | null>(null);
  readonly painelAuto = signal(false);
  readonly autoBusy = signal(false);
  readonly autoResultado = signal<AutoResult | null>(null);

  abrirPainelAuto(): void {
    if (this.painelAuto()) { this.fecharPainelAuto(); return; }
    this.painelAuto.set(true);
    this.autoResultado.set(null);
    if (!this.regraAuto()) {
      this.svc.autoRule().subscribe({
        next: r => this.regraAuto.set(r),
        error: () => this.notify.error('Não foi possível carregar a regra da conciliação automática.'),
      });
    }
  }
  fecharPainelAuto(): void { this.painelAuto.set(false); this.autoResultado.set(null); }

  executarAuto(): void {
    const id = this.selectedAccountId();
    if (!id) { this.notify.error('Selecione uma conta bancária.'); return; }
    this.autoBusy.set(true);
    this.autoResultado.set(null);
    this.svc.autoReconcile(id).subscribe({
      next: r => {
        this.autoBusy.set(false);
        this.autoResultado.set(r);
        if (r.conciliados.length) { this.notify.success(r.mensagem); this.selectAccount(id); }
        else this.notify.info(r.mensagem);
      },
      error: err => {
        this.autoBusy.set(false);
        this.notify.error(err?.error?.message ?? 'Não foi possível executar a conciliação automática.');
      },
    });
  }

  /**
   * CB-09 / I065: "Importar extrato" não existia na tela. A importação entra como LOTE
   * (mesma infra do TR-14), o que é o que torna o Desfazer possível.
   */
  readonly importBusy = signal(false);
  readonly importResultado = signal<StatementImportResult | null>(null);
  readonly lotes = signal<ImportBatch[]>([]);
  readonly lotesVisiveis = signal(false);
  readonly loteBusy = signal<number | null>(null);

  importarExtrato(file: File): void {
    const id = this.selectedAccountId();
    if (!id) { this.notify.error('Selecione uma conta bancária.'); return; }
    this.importBusy.set(true);
    this.importResultado.set(null);
    this.svc.importStatement(id, file).subscribe({
      next: r => {
        this.importBusy.set(false);
        this.importResultado.set(r);
        this.lotesVisiveis.set(true);
        this.carregarLotes();
        if (r.success) { this.notify.success(`${r.success} de ${r.total} movimento(s) importado(s) do extrato.`); this.selectAccount(id); }
        else this.notify.info('Nenhum movimento novo: confira o resultado da importação.');
      },
      error: err => {
        this.importBusy.set(false);
        this.notify.error(err?.error?.message ?? 'Não foi possível importar o extrato.');
      },
    });
  }

  alternarLotes(): void {
    const abrir = !this.lotesVisiveis();
    this.lotesVisiveis.set(abrir);
    if (abrir) this.carregarLotes();
  }

  carregarLotes(): void {
    this.svc.listStatementBatches().subscribe({
      next: r => this.lotes.set(r?.data ?? []),
      error: () => this.lotes.set([]),
    });
  }

  /** CB-09: desfaz o lote inteiro — os movimentos importados voltam a não existir. */
  desfazerLote(loteId: number): void {
    this.loteBusy.set(loteId);
    this.svc.undoBatch(loteId).subscribe({
      next: () => {
        this.loteBusy.set(null);
        this.notify.success(`Importação #${loteId} desfeita.`);
        this.importResultado.set(null);
        this.carregarLotes();
        const id = this.selectedAccountId();
        if (id) this.selectAccount(id);
      },
      error: err => { this.loteBusy.set(null); this.notify.error(err?.error?.message ?? 'Não foi possível desfazer a importação.'); },
    });
  }

  /**
   * CB-08 / I064: "Importar do banco" no período escolhido. A ligação interna é esta;
   * a perna externa depende de conexão bancária (Open Finance) habilitada para a conta.
   * Sem credencial o servidor responde o motivo e a tela mostra — não falha calada.
   */
  readonly bancoBusy = signal(false);
  readonly bancoResultado = signal<string | null>(null);

  private msgErro(err: any, fallback: string): string {
    const m = err?.error?.message ?? fallback;
    return Array.isArray(m) ? m.join('; ') : m;
  }

  importarDoBanco(): void {
    const id = this.selectedAccountId();
    if (!id) { this.notify.error('Selecione uma conta bancária.'); return; }
    const periodo = this.periodoIso();
    const janela = periodo.from || periodo.to
      ? `${periodo.from ? fmtDate(periodo.from) : 'início'} a ${periodo.to ? fmtDate(periodo.to) : 'hoje'}`
      : 'todo o período';
    this.bancoBusy.set(true);
    this.bancoResultado.set(null);

    // Descobre a conexão Open Finance DESTA conta antes de sincronizar — o accountId
    // do sync é o id da conexão, não o da conta bancária.
    this.svc.listBankConnections().subscribe({
      next: conns => {
        const conexao = (conns ?? []).find(c => c.bankAccountId === id);
        if (!conexao) {
          this.bancoBusy.set(false);
          this.bancoResultado.set(
            'Esta conta ainda não tem conexão bancária (Open Finance) habilitada. ' +
            'A importação direta do banco depende de conectar a conta e de credencial do provedor — ' +
            'pendência externa. Enquanto isso, use "Importar extrato (OFX/Excel)".',
          );
          this.notify.info('Conta sem conexão Open Finance: importe o extrato por arquivo.');
          return;
        }
        this.executarSyncBanco(conexao.id, id, periodo, janela);
      },
      error: err => {
        // Se nem a lista de conexões responde, o motivo já indica a pendência.
        this.bancoBusy.set(false);
        this.bancoResultado.set(`Importação do banco não concluída: ${this.msgErro(err, 'Open Finance indisponível.')}`);
      },
    });
  }

  private executarSyncBanco(connectionId: number, bankAccountId: number, periodo: { from?: string; to?: string }, janela: string): void {
    this.svc.syncFromBank({ accountId: connectionId, ...periodo }).subscribe({
      next: r => {
        this.bancoBusy.set(false);
        const trazidos = r?.imported ?? 0;
        this.bancoResultado.set(
          trazidos
            ? `${trazidos} movimento(s) trazido(s) do banco (${janela}).`
            : `O banco não devolveu movimento novo para ${janela}. ${r?.message ?? ''}`.trim(),
        );
        if (trazidos) { this.notify.success(`${trazidos} movimento(s) trazido(s) do banco.`); this.selectAccount(bankAccountId); }
        else this.notify.info('Nenhum movimento novo veio do banco neste período.');
      },
      error: err => {
        this.bancoBusy.set(false);
        // A mensagem do servidor é o que diz se falta credencial — mostre-a.
        const msg = this.msgErro(err, 'Não foi possível importar do banco.');
        this.bancoResultado.set(`Importação do banco não concluída: ${msg}`);
        this.notify.error(msg);
      },
    });
  }
}