// src/app/features/purchasing-dashboard/purchasing-dashboard.page.ts
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchaseDashboardResponse, PurchaseRequest } from '../purchases/purchases.model';
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
    const total      = res.totalRequests ?? 0;
    const pending    = res.pendingCount ?? 0;
    const inProgress = res.inProgressCount ?? 0;
    const estimated  = res.estimatedValue ?? 0;

    this.metrics.set([
      { label: 'Total de requisições', value: total,                        icon: 'chart'        },
      { label: 'Pendentes',            value: pending,                      icon: 'clock-orange' },
      { label: 'Em andamento',         value: inProgress,                   icon: 'clock-blue'   },
      { label: 'Valor estimado',       value: this.formatCurrency(estimated), icon: 'dollar'     },
    ]);

    this.pendingCount.set(pending);

    this.requisitions.set((res.recentRequests ?? []).map(r => this.toRequisition(r)));

    const distTotal = (res.statusDistribution ?? []).reduce((sum, d) => sum + (d.count ?? 0), 0);
    this.distribution.set((res.statusDistribution ?? []).map(d => ({
      status: d.status,
      label:  REQUISITION_STATUS_LABELS[d.status] ?? d.status,
      count:  d.count ?? 0,
      color:  REQUISITION_STATUS_COLORS[d.status] ?? '#6B7280',
      total:  distTotal,
    })));
  }

  private toRequisition(r: PurchaseRequest): Requisition {
    return {
      id:     String(r.id),
      code:   r.referenceNumber ?? `REQ-${r.id}`,
      status: r.status,
      title:  r.title,
      value:  r.estimatedValue ?? 0,
      author: r.requester?.name ?? '—',
      date:   this.formatDate(r.requestDate),
      stage:  r.stage != null ? `Etapa ${r.stage}` : '',
    };
  }

  private formatDate(iso?: string): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return isNaN(date.getTime()) ? iso : date.toLocaleDateString('pt-BR');
  }
}
