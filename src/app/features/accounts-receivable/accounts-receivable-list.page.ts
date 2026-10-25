// src/app/features/accounts-receivable/accounts-receivable-list.page.ts
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgClass, CurrencyPipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import { AccountsReceivableStore } from './accounts-receivable.store';
import { AccountsReceivableService } from './accounts-receivable.service';
import { PurchasesService } from '../purchases/purchases.service';
import { ReceivableAccount, ReceivableFilters, FilterOption } from './accounts-receivable.model';
import { BaixaModalComponent, BaixaResult } from '../../shared/components/baixa-modal/baixa-modal.component';
import { RenegotiateModalComponent, RenegotiateResult } from '../../shared/components/renegotiate-modal/renegotiate-modal.component';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-accounts-receivable-list',
  standalone: true,
  imports: [FormsModule, NgClass, CurrencyPipe, BaixaModalComponent, RenegotiateModalComponent],
  providers: [AccountsReceivableStore],
  templateUrl: './accounts-receivable-list.page.html',
  styleUrl: './accounts-receivable-list.page.scss',
})
export class AccountsReceivableListPage implements OnInit {
  readonly store = inject(AccountsReceivableStore);
  private svc     = inject(AccountsReceivableService);
  private lookups = inject(PurchasesService);
  private http    = inject(HttpClient);
  private notify  = inject(NotificationService);
  private router  = inject(Router);

  /** CR-03: contas bancárias para o seletor do modal de recebimento. */
  readonly contasBancarias = signal<{ id: number; label: string }[]>([]);

  // ── CR-02: opções dos filtros ─────────────────────────────────────────────
  // Status era select só com o placeholder; Contratante e Período eram texto livre.
  readonly optStatus     = this.svc.statusOptions;
  readonly optDateField  = this.svc.dateFieldOptions;
  readonly optContractor = signal<FilterOption[]>([]);
  /** CR-02/I092: o filtro de parceria existia no servidor e não tinha campo na tela. */
  readonly optPartnership = signal<FilterOption[]>([]);
  /** CR-02/I092: filtros equivalentes aos de Contas a pagar (contrato, categoria/conta,
   *  projeto, centro de custo). As três últimas filtram pelo rateio do título. */
  readonly optContract    = signal<FilterOption[]>([]);
  readonly optAccountPlan = signal<FilterOption[]>([]);
  readonly optProject     = signal<FilterOption[]>([]);
  readonly optCostCenter  = signal<FilterOption[]>([]);

  // FA-09: cadastro manual de conta a receber.
  goNew(): void { this.router.navigate(['/accounts-receivable/new']); }

  // FIN-01: baixa (recebimento) total ou parcial.
  readonly rcvItem = signal<ReceivableAccount | null>(null);
  readonly rcvBusy = signal(false);

  openReceive(item: ReceivableAccount): void { this.rcvItem.set(item); }
  closeReceive(): void { this.rcvItem.set(null); }

  onReceiveConfirm(r: BaixaResult): void {
    const item = this.rcvItem();
    if (!item) return;
    this.rcvBusy.set(true);
    // CR-03: o recebimento leva juros, multa, desconto e conta bancária.
    this.svc.registerReceipt(Number(item.id), {
      amount: r.amount, receiptDate: r.date, note: r.note,
      bankAccountId: r.bankAccountId, interest: r.interest, fine: r.fine, discount: r.discount,
    }).subscribe({
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

  // CR-01: a exportação passa a respeitar os filtros da tela (era a base inteira).
  onExport(): void { this.store.exportExcel(); }
  onImportXml(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;
    this.svc.importXml(files).subscribe({
      next: () => { this.notify.success('XML(s) importado(s).'); this.store.load(); input.value = ''; },
      error: err => { this.notify.error(err?.error?.message ?? 'Falha ao importar o XML.'); input.value = ''; },
    });
  }

  ngOnInit(): void {
    this.store.load();
    // CR-03: contas para o seletor do recebimento.
    this.svc.getBankAccounts().subscribe({
      next: v => this.contasBancarias.set(v),
      error: () => this.contasBancarias.set([]),
    });
    // CR-02: contratantes para o filtro, que era uma caixa de texto.
    this.svc.getContractors().subscribe({
      next: v => this.optContractor.set(v),
      error: () => this.optContractor.set([]),
    });
    // CR-02/I092: termos/parcerias para o novo campo do filtro.
    this.svc.getPartnerships().subscribe({
      next: v => this.optPartnership.set(v),
      error: () => this.optPartnership.set([]),
    });
    // CR-02/I092: contrato, categoria/conta, projeto e centro de custo — os mesmos
    // lookups que Contas a pagar usa, para o filtro ter a mesma paridade.
    this.lookups.getAccountPlansLookup().subscribe({
      next: v => this.optAccountPlan.set((v as any[]).map(r => ({ value: String(r.id), label: r.name }))),
      error: () => this.optAccountPlan.set([]),
    });
    this.lookups.getProjectsLookup().subscribe({
      next: v => this.optProject.set(this.lookups.apenasAnaliticas(v as any).map((r: any) => ({ value: String(r.id), label: r.name }))),
      error: () => this.optProject.set([]),
    });
    this.lookups.getCostCentersLookup().subscribe({
      next: v => this.optCostCenter.set(this.lookups.apenasAnaliticas(v as any).map((r: any) => ({ value: String(r.id), label: r.name }))),
      error: () => this.optCostCenter.set([]),
    });
    this.http.get<any>(`${environment.apiUrl}/v1/purchases/contracts?take=500`).subscribe({
      next: res => {
        const rows: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.optContract.set(rows.map(c => ({ value: String(c.id), label: [c.number, c.title].filter(Boolean).join(' — ') || `Contrato #${c.id}` })));
      },
      error: () => this.optContract.set([]),
    });
  }

  // CR-01/I091: as mesmas visões de Contas a pagar. Antes "Captura de Nota Fiscal" e
  // "Lançamentos" mostravam a MESMA tabela (sem paridade); a captura de NF já é a ação
  // "Emitir nota fiscal" de cada linha (I033), não uma visão.
  readonly viewOptions = [
    { label: 'Lançamentos (um por título)', value: 'LANCAMENTOS' },
    { label: 'Parcelas (uma por vencimento)', value: 'PARCELAS' },
  ];

  readonly ehVisaoParcelas = computed(() => this.store.view() === 'PARCELAS');

  /** CR-01/I091: expande cada título da página em suas parcelas, igual a Pagar. */
  readonly parcelaRows = computed(() =>
    this.store.pageItems().flatMap(t =>
      (t.installments ?? []).map(p => ({
        tituloId: t.id,
        code: t.code,
        contractorName: t.contractorName,
        rotulo: `${p.numero}/${t.installments.length}`,
        dueDate: p.dueDate,
        value: p.value,
        paid: p.paid,
        status: p.status,
      })),
    ),
  );

  readonly pageSizeOptions = [10, 25, 50];

  localFilters: ReceivableFilters = {
    status: '', dateField: 'dueDate', dateStart: '', dateEnd: '', contractor: '', partnership: '',
    contract: '', accountPlan: '', project: '', costCenter: ''
  };

  /** CR-02: o intervalo precisa fechar — de depois de até não filtra nada. */
  get intervaloInvalido(): boolean {
    const { dateStart, dateEnd } = this.localFilters;
    return !!dateStart && !!dateEnd && dateStart > dateEnd;
  }

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
    if (this.intervaloInvalido) return;
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

  /** CR-04: abre o título no formulário, em modo edição — a ação não existia. */
  onEdit(item: ReceivableAccount) {
    this.router.navigate(['/accounts-receivable', item.id, 'edit']);
  }

  // ── CR-01 / I091: as duas ações que Contas a pagar tinha e aqui faltavam ────

  /** Visualizar o título sem abrir o formulário de edição. */
  readonly viewItem = signal<any | null>(null);
  readonly viewBusy = signal(false);

  openView(item: ReceivableAccount): void {
    this.viewBusy.set(true);
    this.viewItem.set(null);
    this.svc.getOne(Number(item.id)).subscribe({
      next: r => { this.viewItem.set(r); this.viewBusy.set(false); },
      error: err => { this.viewBusy.set(false); this.notify.error(err?.error?.message ?? 'Não foi possível abrir o título.'); },
    });
  }
  closeView(): void { this.viewItem.set(null); }

  /**
   * COM-Emitir / I033 (decisão D3): a emissão de nota fiscal fica em Contas a
   * receber. A nota é emitida CONTRA UMA RECEITA, então a ação é da linha e leva
   * os dados do título para o formulário de emissão — contratante, documento,
   * valor e descrição. O código do serviço é dado fiscal e continua sendo escolha
   * de quem emite; nada é transmitido sem a confirmação dele.
   */
  onEmitirNf(item: ReceivableAccount): void {
    this.svc.getOne(Number(item.id)).subscribe({
      next: (r: any) => this.router.navigate(['/integrations/fiscal-documents'], {
        queryParams: {
          emitir: 1,
          receivableId: r.id,
          descricao: r.description ?? '',
          valor: r.amount ?? 0,
          tomador: r.stakeholder?.name ?? '',
          documento: r.document ?? r.stakeholder?.document ?? '',
        },
      }),
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível abrir a emissão para este título.'),
    });
  }

  /** Copiar o título: nasce em aberto, sem recebimentos nem parcelas. */
  onCopy(item: ReceivableAccount): void {
    this.svc.copy(Number(item.id)).subscribe({
      next: () => { this.notify.success('Conta a receber copiada.'); this.store.load(); },
      error: err => this.notify.error(err?.error?.message ?? 'Não foi possível copiar o título.'),
    });
  }

  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }
  dinheiro(v?: number | null): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
  }
  /** O detalhe do servidor traz a situação crua; a tela mostra em português. */
  situacao(raw?: string | null): string { return this.svc.statusLabel(raw); }

  // ── E2: parcelamento (a API já gerava as parcelas; faltava o comando) ──────
  readonly splitTarget = signal<ReceivableAccount | null>(null);
  splitCount = 2;

  openSplit(item: ReceivableAccount) {
    this.splitCount = 2;
    this.splitTarget.set(item);
  }
  closeSplit() { this.splitTarget.set(null); }
  confirmSplit() {
    const item = this.splitTarget();
    if (!item || this.splitCount < 2) return;
    this.store.splitInstallments(item.id, Math.floor(this.splitCount));
    this.closeSplit();
  }
  /** E2: o valor que cada parcela vai ter, mostrado antes de confirmar. */
  get valorPorParcela(): number {
    const item = this.splitTarget();
    if (!item || this.splitCount < 1) return 0;
    const bruto = Number(String(item.value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return Math.round((bruto / Math.floor(this.splitCount)) * 100) / 100;
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