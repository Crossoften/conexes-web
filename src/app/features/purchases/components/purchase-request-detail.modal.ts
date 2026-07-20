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
};

/** Rótulos amigáveis para os campos que aparecem em `changes`. */
const FIELD_LABELS: Record<string, string> = {
  status:       'Status',
  stage:        'Etapa',
  currentStage: 'Etapa',
  buyerId:      'Comprador',
  requesterId:  'Requisitante',
  title:        'Título',
  estimatedValue: 'Valor estimado',
  reason:       'Motivo',
};

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
  changeEntries(changes?: unknown): { label: string; value: string }[] {
    if (!changes) return [];

    // Formato atual do back: array de diffs { field, from, to } → "de → para".
    if (Array.isArray(changes)) {
      return changes
        .filter((c): c is { field: string; from: unknown; to: unknown } =>
          !!c && typeof c === 'object' && 'field' in c)
        .map(c => ({
          label: this.fieldLabel(c.field),
          value: `${this.changeValue(c.field, c.from)} → ${this.changeValue(c.field, c.to)}`,
        }));
    }

    // Formato legado: objeto plano { campo: valor }.
    if (typeof changes === 'object') {
      return Object.entries(changes as Record<string, unknown>).map(([key, val]) => ({
        label: this.fieldLabel(key),
        value: this.changeValue(key, val),
      }));
    }

    return [];
  }

  private fieldLabel(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()).trim();
  }

  private changeValue(key: string, val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    if (key === 'status') return this.statusConfig[val as keyof typeof this.statusConfig]?.label ?? String(val);
    if (PurchaseRequestDetailModalComponent.USER_FIELDS.has(key)) return this.userName(val);
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
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
