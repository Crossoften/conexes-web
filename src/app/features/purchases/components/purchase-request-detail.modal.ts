// src/app/features/purchases/components/purchase-request-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { PurchaseRequest, PurchaseRequestActionLog, PurchaseFile, PurchaseRef, PURCHASE_REQUEST_STATUS_CONFIG } from '../purchases.model';
import { PurchasesService } from '../purchases.service';
import { UploadService } from '../../../shared/services/upload.service';

type DetailTab = 'DADOS' | 'FONTE' | 'ITENS' | 'LOCAL' | 'ANEXOS' | 'HISTORICO';

/** Rótulos amigáveis para os códigos de ação do histórico (fallback prettifica o código). */
const ACTION_LABELS: Record<string, string> = {
  SEED_CREATE:     'Criação (carga inicial)',
  CREATE:          'Criação',
  UPDATE:          'Atualização',
  SUBMIT:          'Enviada para aprovação',
  APPROVE:         'Aprovada',
  REJECT:          'Reprovada',
  REQUEST_CHANGES: 'Ajustes solicitados',
  CANCEL:          'Cancelada',
  RESTART:         'Reiniciada',
  MOVE:            'Movida de etapa',
  CHANGE_BUYER:    'Comprador alterado',
  SET_APPROVERS:   'Aprovadores definidos',
  AWARD:           'Adjudicação',
  COMPLETE:        'Concluída',
  // CP (reteste 22.09 · item 8): ações que apareciam cruas em inglês no histórico.
  APPROVE_LEVEL:      'Aprovação de nível',
  APPROVE_QUOTATION:  'Cotação aprovada',
  REJECT_QUOTATION:   'Cotação reprovada',
  EXPORT_TO_QUOTATION:'Exportada para cotação',
  ORDER_RECEIPT:      'Recebimento registrado',
  COPY:               'Cópia',
  DELETE:             'Exclusão',
};

/** Rótulos amigáveis para os campos que aparecem em `changes`.
 *  CP (reteste 22.09 · item 8): o histórico vazava nomes crus de campos Prisma em
 *  inglês (Order Type, Paying Source, Expected Delivery Date...). Cobrimos todos os
 *  campos da requisição para o histórico ficar 100% em português. */
const FIELD_LABELS: Record<string, string> = {
  status:               'Status',
  stage:                'Etapa',
  currentStage:         'Etapa',
  buyerId:              'Comprador',
  requesterId:          'Requisitante',
  title:                'Título',
  orderType:            'Tipo de pedido',
  requestDate:          'Data da requisição',
  expectedDeliveryDate: 'Data prevista de entrega',
  estimatedValue:       'Valor global estimado',
  description:          'Descrição',
  justification:        'Justificativa',
  commercialConditions: 'Condições comerciais',
  contractorObligations:'Obrigações da contratada',
  contractedObligations:'Obrigações contratadas',
  payingSource:         'Fonte pagadora',
  activity:             'Atividade',
  area:                 'Área',
  uniqueSupplier:       'Fornecedor único',
  exclusiveSupplier:    'Fornecedor exclusivo',
  withoutSubsidy:       'Sem repasse/subsídio',
  subProjectId:         'Subprojeto',
  copiedFromId:         'Copiada de',
  copiedFrom:           'Copiada de',
  referenceNumber:      'Número de referência',
  projectId:            'Projeto',
  costCenterId:         'Centro de custo',
  accountPlanId:        'Categoria/Conta',
  partnershipId:        'Convênio/Parceria',
  contractId:           'Contrato',
  deliveryLocationId:   'Local de entrega',
  supplierCount:        'Qtd. de fornecedores',
  cancelReason:         'Motivo do cancelamento',
  cancelledAt:          'Data do cancelamento',
  reason:               'Motivo',
  // Menus ajustes 28.09 · #8: campos gravados por Adjudicação, Recebimento, aprovação da
  // cotação e aprovação por nível — saíam crus como "Mode", "Order Id", "Receipt Id"...
  mode:                 'Modalidade',
  orderId:              'Pedido de compra',
  orderIds:             'Pedidos de compra',
  supplierId:           'Fornecedor',
  receiptId:            'Recebimento',
  invoiceNumber:        'Nota fiscal',
  quotationId:          'Cotação',
  level:                'Nível de aprovação',
  nextLevel:            'Próximo nível',
};

/** Modalidade da Adjudicação (`mode`). */
const AWARD_MODE_LABELS: Record<string, string> = {
  by_supplier: 'Por fornecedor',
  by_item:     'Por item',
};

/** No Recebimento, `status` é o do Pedido de Compra (não o da requisição). */
const ORDER_STATUS_LABELS: Record<string, string> = {
  Open:       'Aberto',
  InProgress: 'Parcialmente recebido',
  Completed:  'Recebido',
  Cancelled:  'Cancelado',
};

/** Na aprovação/reprovação da cotação, `status` é o da Cotação. */
const QUOTATION_STATUS_LABELS: Record<string, string> = {
  Pending:  'Pendente',
  Sent:     'Enviada',
  Approved: 'Aprovada',
  Rejected: 'Reprovada',
};

const QUOTATION_ACTIONS = new Set(['APPROVE_QUOTATION', 'REJECT_QUOTATION']);

/** Ações que registram um evento, não uma edição: o back grava o contexto em `oldData`
 *  (ex.: `mode`, `orderId`) e o resultado em `newData`, então "de → para" virava
 *  "3 → —". Nelas cada campo mostra só o valor. */
const EVENT_ACTIONS = new Set(['AWARD', 'ORDER_RECEIPT', 'APPROVE_LEVEL', ...QUOTATION_ACTIONS]);

@Component({
  selector: 'app-purchase-request-detail-modal',
  standalone: true,
  imports: [],
  templateUrl: './purchase-request-detail.modal.html',
  styleUrl: './purchase-request-detail.modal.scss',
})
export class PurchaseRequestDetailModalComponent implements OnChanges {
  @Input() request: PurchaseRequest | null = null;
  @Input() loading = false;

  @Output() close  = new EventEmitter<void>();
  @Output() remove = new EventEmitter<number>();

  private svc    = inject(PurchasesService);
  private upload = inject(UploadService);

  activeTab: DetailTab = 'DADOS';

  // CP-34: etapas da esteira (a atual vem de request.currentStage).
  readonly STAGES = ['Requisição', 'Aprovação', 'Cotação', 'Aprovação da cotação', 'Pedido', 'Finalizado'];

  readonly statusConfig = PURCHASE_REQUEST_STATUS_CONFIG;

  /** Requisição já carregada (evita recarga a cada mudança do input `loading`). */
  private loadedForRequest: number | null = null;

  // ── Histórico (FE-11) ───────────────────────────────────────────────────────
  readonly history        = signal<PurchaseRequestActionLog[]>([]);
  readonly historyLoading = signal(false);
  readonly historyError   = signal<string | null>(null);
  private  historyFor: number | null = null;

  // Mapa id→nome de usuários, para resolver `buyerId`/`requesterId` no histórico.
  private readonly users   = signal<Map<number, string>>(new Map());
  private          usersLoaded = false;
  /** Campos de `changes` cujo valor é um id de usuário (resolvido para nome). */
  private static readonly USER_FIELDS = new Set(['buyerId', 'requesterId']);
  // Fix (PDF #2): campos estruturais/relacionais que não devem aparecer no histórico
  // como JSON cru (items, approvalFlow, group, relações e metadados técnicos).
  private static readonly HIDDEN_FIELDS = new Set([
    'items', 'approvalFlow', 'group', 'attachments', 'quotations', 'deliveryLocation',
    'accountPlan', 'costCenter', 'project', 'subProject', 'contract', 'buyer', 'requester',
    // CP (reteste 22.09 · item 8): coleções relacionais que vazavam como "Files/Orders/Approvers".
    'files', 'orders', 'approvers', 'suggestedSuppliers', 'partnership',
    'id', 'createdAt', 'updatedAt',
  ]);

  // ── Anexos (FE-10) ──────────────────────────────────────────────────────────
  readonly files        = signal<PurchaseFile[]>([]);
  readonly filesLoading = signal(false);
  readonly filesError   = signal<string | null>(null);
  readonly uploading    = signal(false);
  private  filesFor: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    // Só reage quando a requisição em si muda — o toggle de `loading` não deve
    // apagar o que já foi carregado (evitava recarga/flicker desnecessário).
    if (!changes['request']) return;
    const id = this.request?.id ?? null;
    if (id === this.loadedForRequest) return;
    this.loadedForRequest = id;

    // Reseta histórico e anexos da requisição anterior.
    this.history.set([]);  this.historyError.set(null); this.historyFor = null;
    this.files.set([]);    this.filesError.set(null);   this.filesFor = null;

    // Carrega ambos assim que a requisição é definida (eager), sem depender do
    // clique na aba — garante que a chamada aconteça e o resultado já esteja pronto.
    this.loadHistory();
    this.loadFiles();
    this.loadUsers();
  }

  /** Carrega uma vez o lookup de usuários para resolver ids do histórico em nomes. */
  private loadUsers(): void {
    if (this.usersLoaded) return;
    this.usersLoaded = true;
    this.svc.getUsersLookup().subscribe({
      next: (list: PurchaseRef[]) =>
        this.users.set(new Map(list.map(u => [Number(u.id), u.name] as [number, string]))),
      error: () => { this.usersLoaded = false; },  // permite nova tentativa
    });
  }

  private loadHistory(): void {
    const id = this.request?.id;
    if (!id || this.historyFor === id) return;
    this.historyFor = id;
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.svc.getRequestActionHistory(id).subscribe({
      next: h => { this.history.set(h ?? []); this.historyLoading.set(false); },
      error: err => {
        this.historyFor = null;   // permite nova tentativa ao reabrir a aba
        this.historyLoading.set(false);
        const msg = err?.error?.message ?? 'Não foi possível carregar o histórico.';
        this.historyError.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // ── Anexos (FE-10) ──────────────────────────────────────────────────────────
  private loadFiles(): void {
    const id = this.request?.id;
    if (!id || this.filesFor === id) return;
    this.filesFor = id;
    this.filesLoading.set(true);
    this.filesError.set(null);
    this.svc.listRequestFiles(id).subscribe({
      next: f => { this.files.set(f ?? []); this.filesLoading.set(false); },
      error: err => {
        this.filesFor = null;
        this.filesLoading.set(false);
        const msg = err?.error?.message ?? 'Não foi possível carregar os anexos.';
        this.filesError.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  onUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    const id    = this.request?.id;
    if (!file || !id) return;
    this.uploading.set(true);
    this.filesError.set(null);
    // 1) sobe o arquivo → { fileUrl, fileKey }; 2) vincula à requisição (só fileUrl+fileKey).
    this.upload.uploadOneFile(file).subscribe({
      next: up => this.svc.attachRequestFile(id, { fileUrl: up.fileUrl, fileKey: up.fileKey }).subscribe({
        next: created => { this.files.update(list => [...list, created]); this.uploading.set(false); },
        error: err => this.onUploadError(err),
      }),
      error: err => this.onUploadError(err),
    });
    input.value = ''; // permite reenviar o mesmo arquivo
  }

  private onUploadError(err: unknown): void {
    this.uploading.set(false);
    const msg = (err as { error?: { message?: string | string[] } })?.error?.message ?? 'Falha ao anexar o arquivo.';
    this.filesError.set(Array.isArray(msg) ? msg.join(', ') : msg);
  }

  removeFile(fileId: number): void {
    const id = this.request?.id;
    if (!id) return;
    this.svc.removeRequestFile(id, fileId).subscribe({
      next: () => this.files.update(list => list.filter(f => f.id !== fileId)),
      error: err => this.onUploadError(err),
    });
  }

  /** Nome exibível do anexo (usa `name`; senão deriva da chave/URL). */
  fileName(f: PurchaseFile): string {
    if (f.name && f.name.trim()) return f.name;
    const source = f.fileKey || f.fileUrl || '';
    const last = source.split('/').pop() ?? '';
    return decodeURIComponent(last) || `Anexo #${f.id}`;
  }

  setTab(tab: DetailTab): void {
    this.activeTab = tab;
    if (tab === 'HISTORICO') this.loadHistory();
    if (tab === 'ANEXOS')    this.loadFiles();
  }

  onClose(): void {
    this.activeTab = 'DADOS';
    this.close.emit();
  }

  onDelete(): void {
    if (this.request) this.remove.emit(this.request.id);
  }

  // CP-31: exporta a requisição para Excel estruturado (Blob gerado no back).
  readonly exporting = signal(false);
  onExportExcel(): void {
    const id = this.request?.id;
    if (!id || this.exporting()) return;
    this.exporting.set(true);
    this.svc.generateRequestExcel(id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `requisicao_${this.request?.referenceNumber ?? id}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  // ── Accessors ───────────────────────────────────────────────────────────────

  get code(): string {
    if (!this.request) return '—';
    return this.request.referenceNumber ?? `REQ-#${this.request.id}`;
  }

  get statusLabel(): string {
    if (!this.request) return '';
    return this.statusConfig[this.request.status]?.label ?? this.request.status;
  }

  get statusVariant(): string {
    if (!this.request) return 'neutral';
    return this.statusConfig[this.request.status]?.variant ?? 'neutral';
  }

  fmtDate(iso?: string | null): string {
    if (!iso) return 'N/A';
    const date = new Date(iso);
    return isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
  }

  /** Data + hora (dd/mm/aaaa HH:mm) para o histórico. */
  fmtDateTime(iso?: string | null): string {
    if (!iso) return 'N/A';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /** Traduz o código de ação do histórico; prettifica códigos desconhecidos. */
  actionLabel(action?: string | null): string {
    if (!action) return '—';
    return ACTION_LABELS[action] ?? action.toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  }

  /** Converte `changes` em pares legíveis (rótulo + valor). */
  changeEntries(changes?: unknown, action?: string | null): { label: string; value: string }[] {
    if (!changes) return [];
    const isEvent = !!action && EVENT_ACTIONS.has(action);

    // Formato atual do back: array de diffs { field, from, to } → "de → para".
    if (Array.isArray(changes)) {
      return changes
        .filter((c): c is { field: string; from: unknown; to: unknown } =>
          !!c && typeof c === 'object' && 'field' in c
          && !PurchaseRequestDetailModalComponent.HIDDEN_FIELDS.has((c as { field: string }).field))
        .map(c => ({
          label: this.fieldLabel(c.field, action),
          value: isEvent && (c.from == null || c.to == null)
            ? this.changeValue(c.field, c.to ?? c.from, action)
            : `${this.changeValue(c.field, c.from, action)} → ${this.changeValue(c.field, c.to, action)}`,
        }));
    }

    // Formato legado: objeto plano { campo: valor }.
    if (typeof changes === 'object') {
      return Object.entries(changes as Record<string, unknown>)
        .filter(([key]) => !PurchaseRequestDetailModalComponent.HIDDEN_FIELDS.has(key))
        .map(([key, val]) => ({
          label: this.fieldLabel(key, action),
          value: this.changeValue(key, val, action),
        }));
    }

    return [];
  }

  private fieldLabel(key: string, action?: string | null): string {
    if (key === 'status' && action === 'ORDER_RECEIPT') return 'Status do pedido';
    if (key === 'status' && action && QUOTATION_ACTIONS.has(action)) return 'Status da cotação';
    return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()).trim();
  }

  private changeValue(key: string, val: unknown, action?: string | null): string {
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'status') {
      const s = String(val);
      if (action === 'ORDER_RECEIPT') return ORDER_STATUS_LABELS[s] ?? s;
      if (action && QUOTATION_ACTIONS.has(action)) return QUOTATION_STATUS_LABELS[s] ?? s;
      return this.statusConfig[s as keyof typeof this.statusConfig]?.label ?? s;
    }
    if (key === 'mode') return AWARD_MODE_LABELS[String(val)] ?? String(val);
    if (key === 'orderId') return this.orderLabel(val);
    if (key === 'orderIds' && Array.isArray(val)) return val.map(v => this.orderLabel(v)).join(' · ');
    if (key === 'supplierId') return this.supplierLabel(val);
    if (key === 'quotationId') return this.quotationLabel(val);
    if (key === 'receiptId') return `nº ${val}`;
    if (key === 'level' || key === 'nextLevel') return `Nível ${val}`;
    if (PurchaseRequestDetailModalComponent.USER_FIELDS.has(key)) return this.userName(val);
    // "true/false" também é inglês na tela.
    if (typeof val === 'boolean') return this.fmtBool(val);
    if (typeof val === 'string' && /(Date|At)$/.test(key) && /^\d{4}-\d{2}-\d{2}T/.test(val)) return this.fmtDate(val);
    // Rede de segurança: nunca vaza JSON cru se algum objeto escapar do HIDDEN_FIELDS.
    if (Array.isArray(val)) return `${val.length} ${val.length === 1 ? 'item' : 'itens'}`;
    if (typeof val === 'object') return '—';
    return String(val);
  }

  /** Pedido pelo nº (e fornecedor) quando a requisição já o traz; senão, pelo id. */
  private orderLabel(val: unknown): string {
    const order = this.request?.orders?.find(o => o.id === Number(val));
    if (!order) return `#${val}`;
    const num = order.number ? `nº ${order.number}` : `#${order.id}`;
    return order.supplier?.name ? `${num} — ${order.supplier.name}` : num;
  }

  private supplierLabel(val: unknown): string {
    const id = Number(val);
    const r = this.request;
    const name = r?.orders?.find(o => o.supplierId === id)?.supplier?.name
      ?? r?.quotations?.find(q => q.supplierId === id)?.supplier?.name
      ?? r?.suggestedSuppliers?.find(s => s.supplierId === id)?.supplier?.name;
    return name ?? `Fornecedor #${val}`;
  }

  private quotationLabel(val: unknown): string {
    const q = this.request?.quotations?.find(x => x.id === Number(val));
    return q?.supplier?.name ? `#${val} — ${q.supplier.name}` : `#${val}`;
  }

  /** Resolve um id de usuário em nome (fallback: "Usuário #id" enquanto o lookup não chega). */
  private userName(val: unknown): string {
    const id = Number(val);
    if (!Number.isFinite(id) || id <= 0) return String(val);
    return this.users().get(id) ?? `Usuário #${id}`;
  }

  fmtCurrency(value?: number | null): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  fmtBool(value?: boolean): string {
    return value ? 'Sim' : 'Não';
  }

  fmtText(value?: string | null): string {
    return value && value.trim() ? value : 'N/A';
  }
}
