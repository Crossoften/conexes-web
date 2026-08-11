// features/financial-reports/financial-reports.page.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../shared/services/notification.service';
import { FinancialReportsService, ReportFilters, ReportRow } from './financial-reports.service';

@Component({
  selector: 'app-financial-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-reports.page.html',
  styleUrl: './financial-reports.page.scss',
})
export class FinancialReportsPage implements OnInit {
  private service = inject(FinancialReportsService);
  private notify = inject(NotificationService);

  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  readonly loading = signal(false);
  readonly payables = signal<ReportRow[]>([]);
  readonly receivables = signal<ReportRow[]>([]);

  startDate = '';
  endDate = '';
  status = '';

  readonly statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'Open', label: 'Em aberto' },
    { value: 'Paid', label: 'Pago/Recebido' },
    { value: 'UnderReview', label: 'Em análise' },
    { value: 'Returned', label: 'Devolvido' },
    { value: 'Cancelled', label: 'Cancelado' },
  ];

  readonly rows = computed(() =>
    [...this.payables(), ...this.receivables()].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
  );

  private sum(list: ReportRow[], status?: string): number {
    return list.filter(r => !status || r.status === status).reduce((a, r) => a + r.value, 0);
  }

  readonly payOpen  = computed(() => this.sum(this.payables(), 'Open'));
  readonly payPaid  = computed(() => this.sum(this.payables(), 'Paid'));
  readonly recOpen  = computed(() => this.sum(this.receivables(), 'Open'));
  readonly recPaid  = computed(() => this.sum(this.receivables(), 'Paid'));
  readonly balance  = computed(() => this.sum(this.receivables()) - this.sum(this.payables()));

  ngOnInit(): void { this.apply(); }

  apply(): void {
    this.loading.set(true);
    const filters: ReportFilters = { startDate: this.startDate, endDate: this.endDate, status: this.status };
    this.service.load(filters).subscribe({
      next: data => {
        this.payables.set(data.payables);
        this.receivables.set(data.receivables);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.notify.error('Não foi possível carregar o relatório.'); },
    });
  }

  clear(): void {
    this.startDate = ''; this.endDate = ''; this.status = '';
    this.apply();
  }

  money(v: number): string { return this.brl.format(v || 0); }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      Open: 'Em aberto', Paid: 'Pago/Recebido', UnderReview: 'Em análise',
      Returned: 'Devolvido', Cancelled: 'Cancelado', Reconciled: 'Conciliado',
    };
    return map[s] ?? s;
  }

  exportPayables(): void {
    this.service.exportPayables().subscribe({
      next: b => this.download(b, 'contas-a-pagar'),
      error: () => this.notify.error('Erro ao exportar contas a pagar.'),
    });
  }
  exportReceivables(): void {
    this.service.exportReceivables().subscribe({
      next: b => this.download(b, 'contas-a-receber'),
      error: () => this.notify.error('Erro ao exportar contas a receber.'),
    });
  }

  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
