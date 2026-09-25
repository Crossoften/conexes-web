// src/app/features/quotations/quotations-list.page.ts
import { Component, inject, computed, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotationsStore } from './quotations.store';
import { Quotation, REQ_STATUS_CONFIG } from './quotations.model';
import { PurchaseRequestStatus, PurchaseActionKind, PurchaseActionResult } from '../purchases/purchases.model';
import { PurchaseRequestDetailModalComponent } from '../purchases/components/purchase-request-detail.modal';
import { PurchaseRequestActionModalComponent } from '../purchases/components/purchase-request-action.modal';
import { PurchaseQuotationsModalComponent } from '../purchases/components/purchase-quotations.modal';
import { PurchaseAwardModalComponent } from '../purchases/components/purchase-award.modal';
import { PurchasePermissionsService } from '../purchases/purchase-permissions.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';

@Component({
  selector: 'app-quotations-list',
  standalone: true,
  imports: [FormsModule, NgClass, PurchaseRequestDetailModalComponent, PurchaseRequestActionModalComponent, PurchaseQuotationsModalComponent, PurchaseAwardModalComponent, ConfirmDialogComponent, TooltipDirective],
  providers: [QuotationsStore],
  templateUrl: './quotations-list.page.html',
  styleUrl: './quotations-list.page.scss',
})
export class QuotationsListPage {
  readonly store     = inject(QuotationsStore);
  readonly route     = inject(ActivatedRoute);
  private  router     = inject(Router);
  readonly perms     = inject(PurchasePermissionsService);
  readonly reqConfig = REQ_STATUS_CONFIG;

  /** 0..5 = Etapas 1..6; 6 = Histórico. */
  readonly routeStage: number = this.route.snapshot.data['stage'] ?? 0;

  readonly sectionTitle = computed(() => this.route.snapshot.data['title'] ?? 'Requisições');

  // ── Ações disponíveis por etapa × papel de compras ─────────────────────────
  // Papel aprovador: Etapa 2 (stage 1) = Supervisor de Requisição; Etapa 4 (stage 3)
  // = Supervisor de Compras. Gestor sempre pode. (Backend valida a alçada por valor.)
  // Se o /my-self ainda não trouxe purchaseRoles, cai no fallback por role global.
  readonly hasApprovalRole = computed(() => {
    const onApprovalStage = this.routeStage === 1 || this.routeStage === 3;
    if (!onApprovalStage) return false;
    if (this.perms.hasNoPurchaseRoleInfo()) return this.perms.canApproveByGlobalRole();
    return (
      (this.routeStage === 1 && (this.perms.isRequestSupervisor()  || this.perms.isManager())) ||
      (this.routeStage === 3 && (this.perms.isPurchaseSupervisor() || this.perms.isManager()))
    );
  });
  // CP-fix (Bug 3): aprovar disponível na Etapa 2 (2→3) e também na Etapa 4 (4→5).
  // Na Etapa 4 a adjudicação (award) exige propostas elegíveis; quando não há, o admin
  // ficava travado. O POST /approve conclui a aprovação da cotação e leva ao Pedido
  // (o back gera o pedido a partir da cotação aprovada, quando existe).
  readonly canApprove = computed(() => (this.routeStage === 1 || this.routeStage === 3) && this.hasApprovalRole());
  readonly canReject = this.hasApprovalRole;
  // Solicitar ajustes (FE-6): mesmos perfis/etapas do reprovar (Etapa 2/4).
  readonly canRequestChanges = this.hasApprovalRole;

  // Cancelar: ação administrativa exclusiva do Gestor (nas etapas onde já aparecia).
  readonly canCancel = computed(() =>
    (this.routeStage === 0 || this.routeStage === 2) && this.perms.isManager(),
  );

  // Enviar para aprovação (Etapa 1 → 2): disponível a todos os perfis na Etapa 1.
  readonly canSubmit = this.routeStage === 0;

  // Concluir (Etapa 5 → 6): FE-9.
  readonly canComplete = this.routeStage === 4;

  // Exportar para cotação (Etapa 3 → gera cotação): FE-5b.
  readonly canExportQuotation = this.routeStage === 2;

  // Cotações (FE-7): botão nas Etapas 3 (registrar) e 4 (aprovar/reprovar propostas).
  readonly canQuotations        = this.routeStage === 2 || this.routeStage === 3;
  readonly canRegisterQuotation = this.routeStage === 2;   // Etapa 3

  // Adjudicação (FE-8): Etapa 4, exige papel de aprovação (Supervisor de Compras / Gestor).
  readonly canAward = computed(() => this.routeStage === 3 && this.hasApprovalRole());

  // Consultar/Duplicar/Excel/PDF disponíveis a todos, conforme a etapa.
  readonly canCopy   = this.routeStage === 0 || this.routeStage === 2;
  readonly canExcel  = this.routeStage === 0 || this.routeStage === 2;
  readonly canPdf    = true;                                           // FE-12: consulta em qualquer etapa
  readonly canDelete = this.routeStage === 0;                          // Etapa 1 (rascunho)
  readonly canEdit   = this.routeStage === 0;                          // Etapa 1

  readonly statusOptions: { label: string; value: PurchaseRequestStatus | '' }[] = [
    { label: 'Selecione o status', value: '' },
    { label: 'Rascunho',             value: 'Draft' },
    { label: 'Aguardando aprovação', value: 'AwaitingApproval' },
    { label: 'Cotação',              value: 'Quotation' },
    { label: 'Cotação em aprovação', value: 'QuotationApproval' },
    { label: 'Pedido',               value: 'Order' },
    { label: 'Concluído',            value: 'Completed' },
    { label: 'Cancelado',            value: 'Cancelled' },
    { label: 'Rejeitado',            value: 'Rejected' },
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

  constructor() {
    this.store.load(this.routeStage);
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  onSearch(value: string) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.store.setSearch(value), 400);
  }

  getSortState(col: keyof Quotation): 'none' | 'asc' | 'desc' {
    const { column, direction } = this.store.sort();
    if (column !== col || !direction) return 'none';
    return direction;
  }

  goToPage(p: number | '...') {
    if (typeof p === 'number') this.store.setPage(p);
  }

  trackById(_: number, item: Quotation) { return item.id; }

  // ── Handlers de ação ────────────────────────────────────────────────────────
  view(item: Quotation)    { this.store.openDetail(item.apiId); }
  edit(item: Quotation)    { this.router.navigate(['/quotations/edit', item.apiId]); }
  reject(item: Quotation)  { this.store.openAction('reject', item.apiId); }
  requestChanges(item: Quotation) { this.store.openAction('request-changes', item.apiId); }
  cancel(item: Quotation)  { this.store.openAction('cancel', item.apiId); }
  openQuotations(item: Quotation) { this.store.openQuotations(item); }
  openAward(item: Quotation) { this.store.openAward(item); }
  excel(item: Quotation)   { this.store.exportExcel(item.apiId); }
  pdf(item: Quotation)     { this.store.exportPdf(item.apiId); }

  onActionConfirm(result: PurchaseActionResult) { this.store.submitAction(result); }

  // ── item 11: confirmação antes de avançar etapa / alterar dados ou status ────
  readonly confirmState = signal<{ title: string; message: string; confirmLabel: string; danger: boolean; run: () => void } | null>(null);

  private ask(title: string, message: string, confirmLabel: string, run: () => void, danger = false): void {
    this.confirmState.set({ title, message, confirmLabel, danger, run });
  }
  onConfirmProceed(): void { const c = this.confirmState(); this.confirmState.set(null); c?.run(); }
  onConfirmCancel():  void { this.confirmState.set(null); }

  submit(item: Quotation) {
    this.ask('Enviar para aprovação', `Enviar a requisição ${item.typeId} para aprovação? Ela avança para a próxima etapa.`, 'Enviar', () => this.store.submit(item.apiId));
  }
  approve(item: Quotation) {
    const msg = this.routeStage === 3
      ? `Concluir a aprovação da cotação de ${item.typeId} e avançar para Pedido?`
      : `Aprovar a requisição ${item.typeId} e avançar de etapa?`;
    this.ask('Confirmar aprovação', msg, 'Aprovar', () => this.store.approve(item.apiId));
  }
  exportToQuotation(item: Quotation) {
    this.ask('Enviar cotação para aprovação', `Enviar a cotação de ${item.typeId} para aprovação (avança para a Etapa 4)?`, 'Enviar', () => this.store.exportToQuotation(item.apiId));
  }
  complete(item: Quotation) {
    this.ask('Concluir pedido', `Concluir o pedido de ${item.typeId}? O processo é finalizado.`, 'Concluir', () => this.store.complete(item.apiId));
  }
  copy(item: Quotation) {
    this.ask('Duplicar requisição', `Criar uma cópia da requisição ${item.typeId}?`, 'Duplicar', () => this.store.copy(item.apiId));
  }
  remove(item: Quotation) {
    this.ask('Excluir requisição', `Excluir a requisição ${item.typeId}? Esta ação não pode ser desfeita.`, 'Excluir', () => this.store.remove(item.apiId), true);
  }

  // ── Menu "⋮" de ações secundárias (Excel, PDF, Cancelar, Excluir) ───────────
  readonly hasRowMenu = computed(() => this.canExcel || this.canPdf || this.canCancel() || this.canDelete);

  readonly menuOpenId = signal<string | null>(null);
  readonly menuPos    = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  @HostListener('document:click')
  @HostListener('window:scroll')
  @HostListener('window:resize')
  closeMenu() { this.menuOpenId.set(null); }

  toggleMenu(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (this.menuOpenId() === id) { this.menuOpenId.set(null); return; }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuPos.set({ top: rect.bottom + 6, left: Math.max(8, rect.right - 200) });
    this.menuOpenId.set(id);
  }
}
