// src/app/features/accounts-payable/form/financial-title-view.component.ts
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of, catchError, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AccountsPayableService } from '../accounts-payable.service';
import { AccountsReceivableService } from '../../accounts-receivable/accounts-receivable.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { PopupShellComponent } from '../../../shared/components/popup-shell/popup-shell.component';
import { ProcessChatComponent } from '../../../shared/components/process-chat/process-chat.component';
import { IMPOSTOS, ROTULO_TIPO_PAGAMENTO, TIPOS_DOCUMENTO } from './financial-title.constants';

type AbaV = 'GERAIS' | 'CONTRATO' | 'SERVICO' | 'PAGAMENTO' | 'RATEIO' | 'IMPOSTOS' | 'ANEXOS';

const STATUS: Record<string, string> = {
  Open: 'Em aberto', PartiallyPaid: 'Parcialmente pago', Paid: 'Pago', Cancelled: 'Cancelado', Reconciled: 'Conciliado',
  UnderReview: 'Em análise', Returned: 'Devolvido', Renegotiated: 'Renegociado',
};
const REMESSA: Record<string, string> = { NotSent: 'Não enviada', Queued: 'Na fila da remessa', Sent: 'Enviada', Processed: 'Processada', Rejected: 'Rejeitada' };

/**
 * Card #768 (itens 44 e 56 — cenários 28, 29, 30 e 39): visualizar a conta a pagar
 * (e a receber) no padrão dos pop-ups — cabeçalho roxo com Editar, Excluir e
 * Fechar, e as abas do formulário: Dados gerais, Competência e contrato,
 * Classificação do serviço, Dados de pagamento, Rateio e parcelamento, Impostos
 * retidos e Anexos. Antes era uma lista simples, de cabeçalho branco, só com Fechar.
 */
@Component({
  selector: 'app-financial-title-view',
  standalone: true,
  imports: [PopupShellComponent, ProcessChatComponent],
  templateUrl: './financial-title-view.component.html',
  styleUrl: './financial-title-view.component.scss',
})
export class FinancialTitleViewComponent implements OnInit {
  private http = inject(HttpClient);
  private apSvc = inject(AccountsPayableService);
  private arSvc = inject(AccountsReceivableService);
  private lookups = inject(PurchasesService);

  @Input() kind: 'pagar' | 'receber' = 'pagar';
  @Input({ required: true }) id!: number;
  @Input() podeEditar = true;
  @Input() podeExcluir = true;
  @Input() podeConferir = false;
  @Output() editar = new EventEmitter<void>();
  @Output() excluir = new EventEmitter<void>();
  @Output() conferir = new EventEmitter<void>();
  @Output() devolver = new EventEmitter<void>();
  @Output() fechar = new EventEmitter<void>();

  get pagar(): boolean { return this.kind === 'pagar'; }
  aba: AbaV = 'GERAIS';
  readonly t = signal<any | null>(null);
  readonly erro = signal<string | null>(null);
  readonly anexos = signal<any[]>([]);
  private nomes = { plano: new Map<number, string>(), centro: new Map<number, string>(), projeto: new Map<number, string>(), servico: new Map<number, string>(), conta: new Map<number, string>(), contrato: new Map<number, any>(), termo: new Map<number, string>() };
  readonly prontos = signal(0);
  readonly impostos = IMPOSTOS;

  ngOnInit(): void {
    const req = this.pagar ? this.apSvc.getById(this.id) : this.arSvc.getById(this.id);
    (req as any).subscribe({ next: (r: any) => this.t.set(r), error: () => this.erro.set('Não foi possível abrir o título.') });
    (this.pagar ? this.apSvc.listFiles(this.id) : this.arSvc.listFiles(this.id) as any).subscribe({ next: (v: any) => this.anexos.set(v ?? []), error: () => {} });
    const mapa = (v: any[], k = 'name') => new Map<number, string>((v ?? []).map((x: any) => [Number(x.id), x[k] ?? x.name] as [number, string]));
    const tick = () => this.prontos.update(n => n + 1);
    this.lookups.getAccountPlansLookup().subscribe({ next: v => { this.nomes.plano = mapa(v as any[]); tick(); } });
    this.lookups.getCostCentersLookup().subscribe({ next: v => { this.nomes.centro = mapa(v as any[]); tick(); } });
    this.lookups.getProjectsLookup().subscribe({ next: v => { this.nomes.projeto = new Map([...this.nomes.projeto, ...mapa(v as any[])]); tick(); } });
    this.lookups.getActivitiesLookup().subscribe({ next: v => { this.nomes.projeto = new Map([...this.nomes.projeto, ...mapa(v as any[])]); tick(); } });
    this.lookups.getProductsServicesLookup().subscribe({ next: v => { this.nomes.servico = mapa(v as any[]); tick(); } });
    this.apSvc.getBankAccounts().subscribe({ next: v => { this.nomes.conta = new Map(v.map(c => [c.id, c.label] as [number, string])); tick(); } });
    this.http.get<any>(`${environment.apiUrl}/v1/purchases/contracts`, { params: new HttpParams().set('take', 500) })
      .pipe(map(r => (Array.isArray(r) ? r : r?.data ?? []) as any[]), catchError(() => of([] as any[])))
      .subscribe(rows => { this.nomes.contrato = new Map(rows.map(c => [Number(c.id), c] as [number, any])); tick(); });
    if (!this.pagar) {
      this.http.get<any>(`${environment.apiUrl}/v1/partnerships`, { params: new HttpParams().set('take', 500) })
        .pipe(map(r => (Array.isArray(r) ? r : r?.data ?? []) as any[]), catchError(() => of([] as any[])))
        .subscribe(rows => { this.nomes.termo = new Map(rows.map(t => [Number(t.id), [t.termNumber ?? t.number, t.title ?? t.name].filter(Boolean).join(' — ')] as [number, string])); tick(); });
    }
  }

  // ── formatação ────────────────────────────────────────────────────────────
  brl(v: any): string { return v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0); }
  dt(iso: any): string { if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
  status(s: string): string { return STATUS[s] ?? s ?? '—'; }
  remessa(s: string): string { return REMESSA[s] ?? '—'; }
  tipoDoc(v: string): string { return TIPOS_DOCUMENTO.find(t => t.valor === v)?.rotulo ?? v ?? '—'; }
  tipoPag(v: string): string { return v ? (ROTULO_TIPO_PAGAMENTO[v] ?? v) : '—'; }
  plano(id: any): string { this.prontos(); return id ? (this.nomes.plano.get(Number(id)) ?? `#${id}`) : '—'; }
  centro(id: any): string { this.prontos(); return id ? (this.nomes.centro.get(Number(id)) ?? `#${id}`) : '—'; }
  projeto(id: any): string { this.prontos(); return id ? (this.nomes.projeto.get(Number(id)) ?? `#${id}`) : '—'; }
  servico(id: any): string { this.prontos(); return id ? (this.nomes.servico.get(Number(id)) ?? `#${id}`) : '—'; }
  conta(id: any): string { this.prontos(); return id ? (this.nomes.conta.get(Number(id)) ?? `#${id}`) : '—'; }
  termo(id: any): string { this.prontos(); return id ? (this.nomes.termo.get(Number(id)) ?? `#${id}`) : '—'; }
  contrato(id: any): any { this.prontos(); return id ? (this.nomes.contrato.get(Number(id)) ?? null) : null; }
  contratoNome(id: any): string { const c = this.contrato(id); return c ? ([c.number, c.title].filter(Boolean).join(' — ') || `#${id}`) : (id ? `#${id}` : '—'); }
  valor(t: any): number { return this.pagar ? (t.grossAmount ?? t.amount ?? 0) : (t.amount ?? 0); }
  liquido(t: any): number { return this.pagar ? (t.netAmount ?? t.amount ?? 0) : (t.netAmount ?? t.amount ?? 0); }
  // a baixa de pagar abate o líquido; o recebimento de receber anda sobre o valor do título (como no servidor)
  saldo(t: any): number { return Math.max(0, this.pagar ? this.liquido(t) - (t.amountPaid ?? 0) : (t.amount ?? 0) - (t.amountReceived ?? 0)); }
  retido(t: any): number { return (t.taxes ?? []).reduce((s: number, x: any) => s + (x.amount ?? 0), 0); }
  imposto(t: any, tipo: string): any { return (t.taxes ?? []).find((x: any) => x.taxType === tipo) ?? null; }
  /** card #720 (PG-01): gerar de novo a cobrança Asaas do título a receber. */
  readonly cobrando = signal(false);
  gerarCobranca(): void {
    this.cobrando.set(true);
    this.arSvc.retryAsaasCharge(this.id).subscribe({
      next: (r: any) => { this.cobrando.set(false); this.t.set({ ...this.t(), ...r }); },
      error: (e: any) => { this.cobrando.set(false); this.erro.set(e?.error?.message ?? 'Não foi possível gerar a cobrança.'); },
    });
  }
  nomeDoAnexo(a: any): string { const b = a.fileKey || a.fileUrl || ''; try { return decodeURIComponent(String(b).split('?')[0].split('/').pop() || 'arquivo'); } catch { return 'arquivo'; } }
}
