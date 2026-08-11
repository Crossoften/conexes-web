// features/dashboard/dashboard.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService, DashboardSummary, DashboardAccountability } from './dashboard.service';

interface KpiCard {
  key:   keyof DashboardSummary;
  label: string;
  icon:  string;
  route: string;
  tone:  'purple' | 'orange' | 'info' | 'success';
}

interface Shortcut {
  label: string;
  desc:  string;
  icon:  string;
  route: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private service = inject(DashboardService);

  readonly user = this.auth.user;
  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary>({
    stakeholders: 0, partnerships: 0, payablesOpen: 0, payablesOpenValue: 0, accountabilities: 0,
  });
  private readonly brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  readonly recent = signal<DashboardAccountability[]>([]);

  readonly kpis: KpiCard[] = [
    { key: 'stakeholders',     label: 'Stakeholders',            icon: '👥', route: '/stakeholders',   tone: 'purple'  },
    { key: 'partnerships',     label: 'Parcerias',               icon: '🤝', route: '/work-plans',     tone: 'info'    },
    { key: 'payablesOpen',     label: 'Contas a pagar em aberto', icon: '💸', route: '/accounts-payable', tone: 'orange' },
    { key: 'accountabilities', label: 'Prestações de contas',    icon: '📋', route: '/accountability', tone: 'success' },
  ];

  readonly shortcuts: Shortcut[] = [
    { label: 'Novo stakeholder',   desc: 'Cadastrar fornecedor, cliente ou doador', icon: '➕', route: '/stakeholders/new' },
    { label: 'Contas a pagar',     desc: 'Lançamentos e pagamentos',                icon: '💸', route: '/accounts-payable' },
    { label: 'Análise de notas',   desc: 'Validar notas vindas do compras',         icon: '🧾', route: '/invoice-review' },
    { label: 'Prestação de contas', desc: 'Acompanhar processos de prestação',      icon: '📋', route: '/accountability' },
    { label: 'Plano de trabalho',  desc: 'Parcerias e planos de aplicação',         icon: '📄', route: '/work-plans' },
    { label: 'Conciliação bancária', desc: 'Conferir extratos e lançamentos',       icon: '🏦', route: '/bank-reconciliation' },
  ];

  ngOnInit(): void {
    this.service.summary().subscribe({
      next: s => { this.summary.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.service.recentAccountabilities().subscribe(r => this.recent.set(r));
  }

  get firstName(): string {
    return (this.user()?.name ?? '').split(' ')[0] || 'usuário';
  }

  get payablesOpenValueLabel(): string {
    return this.brl.format(this.summary().payablesOpenValue || 0);
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      Open: 'Aberta', Approved: 'Aprovada', Returned: 'Devolvida',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    if (status === 'Approved') return 'badge--success';
    if (status === 'Returned') return 'badge--danger';
    return 'badge--info';
  }
}
