// features/dashboard/dashboard.page.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, DashboardFiltros } from './dashboard.service';
import { PurchasesService } from '../purchases/purchases.service';
import { PeriodFieldComponent } from '../../shared/components/period-field/period-field.component';
import { NotificationService } from '../../shared/services/notification.service';

type Aba = 'inicio' | 'compras' | 'financeiro';
interface Shortcut { label: string; desc: string; icon: string; route: string; }

const STATUS_REQ: Record<string, { rotulo: string; cor: string }> = {
  Draft: { rotulo: 'Rascunho', cor: '#F59E0B' },
  AwaitingApproval: { rotulo: 'Aguardando aprovação', cor: '#F97316' },
  Quotation: { rotulo: 'Cotação', cor: '#EAB308' },
  QuotationApproval: { rotulo: 'Cotação em aprovação', cor: '#8B5CF6' },
  Order: { rotulo: 'Pedido', cor: '#6366F1' },
  Completed: { rotulo: 'Concluído', cor: '#16A34A' },
  Rejected: { rotulo: 'Rejeitado', cor: '#DC2626' },
  Cancelled: { rotulo: 'Cancelado', cor: '#6B7280' },
};

/**
 * Card #768 (item 72 — cenários 49, 50 e 51): a tela de Início organizada em abas —
 * Início, Compras, Financeiro e Prestação de contas (Em breve). O Financeiro recebe
 * os indicadores que saíram das listas de Contas a pagar e a receber (item 55).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PeriodFieldComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private svc = inject(DashboardService);
  private lookups = inject(PurchasesService);
  private notify = inject(NotificationService);

  readonly user = this.auth.user;
  readonly String = String;
  readonly Math = Math;
  readonly aba = signal<Aba>('inicio');
  readonly carregando = signal(false);
  readonly ini = signal<any | null>(null);
  readonly fin = signal<any | null>(null);
  readonly cmp = signal<any | null>(null);
  readonly filtros = signal<DashboardFiltros>({ startDate: '', endDate: '', costCenterId: '', projectId: '' });
  readonly centros = signal<{ id: number; name: string }[]>([]);
  readonly projetos = signal<{ id: number; name: string }[]>([]);

  // abas internas dos painéis
  readonly vencInicio = signal<'pagar' | 'receber'>('pagar');
  readonly vencPagar = signal<'hoje' | 'semana' | 'proximaSemana'>('hoje');
  readonly vencReceber = signal<'hoje' | 'semana' | 'proximaSemana'>('hoje');
  readonly atrasoPagar = signal<'ate5' | 'ate15' | 'ate30' | 'outros'>('ate15');
  readonly atrasoReceber = signal<'ate5' | 'ate15' | 'ate30' | 'outros'>('ate15');

  readonly shortcuts: Shortcut[] = [
    { label: 'Novo contato', desc: 'Cadastrar fornecedor, cliente ou doador', icon: '+', route: '/stakeholders/new' },
    { label: 'Contas a pagar', desc: 'Lançamentos e pagamentos', icon: '$', route: '/accounts-payable' },
    { label: 'Análise de notas', desc: 'Validar notas vindas do compras', icon: '✓', route: '/invoice-review' },
    { label: 'Prestação de contas', desc: 'Acompanhar processos de prestação', icon: '▤', route: '/accountability' },
    { label: 'Plano de trabalho', desc: 'Parcerias e planos de aplicação', icon: '▦', route: '/work-plans' },
    { label: 'Conciliação bancária', desc: 'Conferir extratos e lançamentos', icon: '⇄', route: '/bank-reconciliation' },
  ];

  get firstName(): string { return (this.user()?.name ?? '').split(' ')[0] || 'usuário'; }

  ngOnInit(): void {
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.centros.set(v as any), error: () => {} });
    this.lookups.getProjectsLookup().subscribe({ next: v => this.projetos.set(v as any), error: () => {} });
    this.carregar();
  }

  irPara(a: Aba): void { this.aba.set(a); this.carregar(); }

  carregar(): void {
    const a = this.aba();
    this.carregando.set(true);
    const fim = () => this.carregando.set(false);
    if (a === 'inicio') this.svc.inicio().subscribe({ next: r => { this.ini.set(r); fim(); }, error: () => fim() });
    if (a === 'financeiro') this.svc.financeiro(this.filtros()).subscribe({ next: r => { this.fin.set(r); fim(); }, error: () => fim() });
    if (a === 'compras') this.svc.compras(this.filtros()).subscribe({ next: r => { this.cmp.set(r); fim(); }, error: () => fim() });
  }

  setFiltro(p: Partial<DashboardFiltros>): void { this.filtros.set({ ...this.filtros(), ...p }); this.carregar(); }

  exportar(): void {
    const a = this.aba();
    if (a === 'inicio') return;
    this.svc.exportar(a, this.filtros()).subscribe({
      next: blob => { const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = `dashboard-${a}.xlsx`; l.click(); URL.revokeObjectURL(u); },
      error: () => this.notify.error('Não foi possível exportar.'),
    });
  }

  // ── formatação ────────────────────────────────────────────────────────────
  brl(v: number | null | undefined): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0); }
  dt(iso: any): string { if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
  statusReq(s: string) { return STATUS_REQ[s] ?? { rotulo: s, cor: '#9CA3AF' }; }
  dias(n: number): string { return n <= 0 ? 'hoje' : n === 1 ? 'há 1 dia' : `há ${n} dias`; }
  pct(v: number, total: number): string { return total ? `${Math.min(100, Math.round((v / total) * 100))}%` : '0%'; }

  readonly distribuicao = computed(() => {
    const d = this.cmp()?.distribuicao ?? {};
    const linhas = Object.keys(STATUS_REQ).map(k => ({ status: k, ...STATUS_REQ[k], quantidade: d[k] ?? 0 }));
    const max = Math.max(1, ...linhas.map(l => l.quantidade));
    return linhas.map(l => ({ ...l, largura: `${Math.round((l.quantidade / max) * 100)}%` }));
  });

  readonly maxCentro = computed(() => Math.max(1, ...(this.cmp()?.porCentroDeCusto ?? []).map((c: any) => c.quantidade)));
  readonly maxSaldo = computed(() => Math.max(1, ...(this.fin()?.saldos ?? []).map((s: any) => Math.abs(s.saldo))));

  /** Fluxo de caixa: duas linhas (despesas e receitas) num SVG simples. */
  readonly grafico = computed(() => {
    const f: { mes: string; despesas: number; receitas: number }[] = this.fin()?.fluxo ?? [];
    const W = 900, H = 200, P = 34;
    if (!f.length) return null;
    const max = Math.max(1, ...f.flatMap(x => [x.despesas, x.receitas]));
    const x = (i: number) => (f.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (f.length - 1));
    const y = (v: number) => H - P - (v / max) * (H - 2 * P);
    const linha = (k: 'despesas' | 'receitas') => f.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
    return { W, H, desp: linha('despesas'), rec: linha('receitas'), pontos: f.map((p, i) => ({ ...p, x: x(i), yd: y(p.despesas), yr: y(p.receitas) })), base: H - P };
  });
}
