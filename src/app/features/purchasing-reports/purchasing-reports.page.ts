// features/purchasing-reports/purchasing-reports.page.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchasesService } from '../purchases/purchases.service';
import {
  PurchaseDashboardResponse, PurchaseRequest, PURCHASE_REQUEST_STATUS_CONFIG,
} from '../purchases/purchases.model';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-purchasing-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchasing-reports.page.html',
  styleUrl: './purchasing-reports.page.scss',
})
export class PurchasingReportsPage implements OnInit {
  private svc = inject(PurchasesService);
  private notify = inject(NotificationService);
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  readonly loading = signal(true);
  readonly dashboard = signal<PurchaseDashboardResponse | null>(null);
  readonly requests = signal<PurchaseRequest[]>([]);

  readonly kpis = computed(() => {
    const c = this.dashboard()?.counters;
    if (!c) return [];
    return [
      { label: 'Total de requisições', value: String(c.total), tone: 'purple' },
      { label: 'Pendentes',            value: String(c.pending), tone: 'orange' },
      { label: 'Em andamento',         value: String(c.inProgress), tone: 'info' },
      { label: 'Concluídas',           value: String(c.completed), tone: 'success' },
      { label: 'Valor estimado',       value: this.brl.format(c.estimatedValue || 0), tone: 'purple' },
    ];
  });

  readonly distribution = computed(() => {
    const d = this.dashboard()?.distribution;
    if (!d) return [];
    return [
      { label: 'Rascunho',            value: d.draft },
      { label: 'Aguardando aprovação', value: d.awaitingApproval },
      { label: 'Cotação',             value: d.quotation },
      { label: 'Aprovação de cotação', value: d.quotationApproval },
      { label: 'Pedido',              value: d.order },
      { label: 'Concluídas',          value: d.completed },
      { label: 'Rejeitadas',          value: d.rejected },
      { label: 'Canceladas',          value: d.cancelled },
    ];
  });

  ngOnInit(): void {
    this.svc.getDashboard().subscribe({
      next: d => { this.dashboard.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Não foi possível carregar o painel de compras.'); },
    });
    this.svc.getRequests({ take: 1000 }).subscribe({
      next: page => this.requests.set(page.data ?? []),
      error: () => {},
    });
  }

  statusLabel(status: string): string {
    return (PURCHASE_REQUEST_STATUS_CONFIG as any)?.[status]?.label ?? status;
  }

  money(v?: number | null): string { return this.brl.format(v || 0); }

  exportExcel(): void {
    this.svc.exportRequestsExcel().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `requisicoes-compra_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Erro ao exportar as requisições.'),
    });
  }
}
