// src/app/features/purchasing-dashboard/purchasing-dashboard.page.ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PurchasesService } from '../purchases/purchases.service';
import {
  PurchaseDashboardResponse,
  PurchaseDashboardDistribution,
  DashboardRecentRequest,
  PurchaseRequestStatus,
} from '../purchases/purchases.model';
import {
  DashboardMetric,
  Requisition,
  StatusDistribution,
  REQUISITION_STATUS_LABELS,
  REQUISITION_STATUS_COLORS,
} from './purchasing-dashboard.model';

@Component({
  selector: 'app-purchasing-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './purchasing-dashboard.page.html',
  styleUrl: './purchasing-dashboard.page.scss',
})
export class PurchasingDashboardPage {
  private svc = inject(PurchasesService);
  private destroyRef = inject(DestroyRef);

  readonly statusLabels = REQUISITION_STATUS_LABELS;
  readonly statusColors = REQUISITION_STATUS_COLORS;

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  // Métricas com 4 posições fixas (o template acessa por índice).
  readonly metrics = signal<DashboardMetric[]>([
    { label: 'Total de requisições', value: 0,          icon: 'chart'        },
    { label: 'Pendentes',            value: 0,          icon: 'clock-orange' },
    { label: 'Em andamento',         value: 0,          icon: 'clock-blue'   },
    { label: 'Valor estimado',       value: 'R$ 0,00',  icon: 'dollar'       },
  ]);

  readonly requisitions = signal<Requisition[]>([]);
  readonly distribution = signal<StatusDistribution[]>([]);
  readonly pendingCount = signal(0);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.applyResponse(res);
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err?.error?.message ?? 'Erro ao carregar o dashboard de compras.');
          this.loading.set(false);
        },
      });
  }

  formatCurrency(value: number): string {
    return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getBarWidth(count: number, total: number): string {
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  // ── Mapeamento da resposta ──────────────────────────────────────────────────

  private applyResponse(res: PurchaseDashboardResponse): void {
    const c       = res.counters;
    const pending = res.pendingCount ?? c?.pending ?? 0;

    this.metrics.set([
      { label: 'Total de requisições', value: c?.total ?? 0,                              icon: 'chart'        },
      { label: 'Pendentes',            value: pending,                                    icon: 'clock-orange' },
      { label: 'Em andamento',         value: c?.inProgress ?? 0,                         icon: 'clock-blue'   },
      { label: 'Valor estimado',       value: this.formatCurrency(c?.estimatedValue ?? 0), icon: 'dollar'      },
    ]);

    this.pendingCount.set(pending);
    this.requisitions.set((res.recentRequests ?? []).map(r => this.toRequisition(r)));
    this.distribution.set(this.buildDistribution(res.distribution));
  }

  private buildDistribution(dist?: PurchaseDashboardDistribution): StatusDistribution[] {
    if (!dist) return [];
    const entries: { status: PurchaseRequestStatus; count: number }[] = [
      { status: 'Draft',             count: dist.draft ?? 0 },
      { status: 'AwaitingApproval',  count: dist.awaitingApproval ?? 0 },
      { status: 'Quotation',         count: dist.quotation ?? 0 },
      { status: 'QuotationApproval', count: dist.quotationApproval ?? 0 },
      { status: 'Order',             count: dist.order ?? 0 },
      { status: 'Completed',         count: dist.completed ?? 0 },
      { status: 'Rejected',          count: dist.rejected ?? 0 },
      { status: 'Cancelled',         count: dist.cancelled ?? 0 },
    ];
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    return entries.map(e => ({
      status: e.status,
      label:  REQUISITION_STATUS_LABELS[e.status],
      count:  e.count,
      color:  REQUISITION_STATUS_COLORS[e.status],
      total,
    }));
  }

  private toRequisition(r: DashboardRecentRequest): Requisition {
    return {
      id:           String(r.id),
      code:         `#${r.id}`,
      status:       r.status,
      title:        r.title,
      elapsedLabel: this.elapsedLabel(r.elapsedDays),
      author:       r.requester ?? '—',
      date:         this.formatDate(r.date),
      stage:        r.stage != null ? `Etapa ${r.stage}` : '',
    };
  }

  private elapsedLabel(days?: number): string {
    if (days == null) return '';
    if (days <= 0)    return 'hoje';
    if (days === 1)   return 'há 1 dia';
    return `há ${days} dias`;
  }

  private formatDate(iso?: string | null): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
  }
}
