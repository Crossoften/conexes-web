// src/app/features/integrations/payments/bank-integrations.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IntegrationsService } from '../integrations.service';
import { BankPaymentOrder, BankPaymentStatus, IntegrationStatus, OpenFinanceAccount } from '../integrations.model';

type Variant = 'success' | 'warning' | 'danger' | 'info';

const PAY_STATUS: Record<BankPaymentStatus, { label: string; variant: Variant }> = {
  Pending:    { label: 'Pendente',    variant: 'info' },
  Processing: { label: 'Processando', variant: 'warning' },
  Paid:       { label: 'Pago',        variant: 'success' },
  Failed:     { label: 'Falhou',      variant: 'danger' },
  Cancelled:  { label: 'Cancelado',   variant: 'danger' },
  Scheduled:  { label: 'Agendado',    variant: 'info' },
};

@Component({
  selector: 'app-bank-integrations',
  standalone: true,
  imports: [NgClass, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './bank-integrations.page.html',
  styleUrls: ['../integrations.shared.scss'],
})
export class BankIntegrationsPage implements OnInit {
  private svc = inject(IntegrationsService);
  private fb  = inject(FormBuilder);

  readonly loading      = signal(true);
  readonly payments     = signal<BankPaymentOrder[]>([]);
  readonly connections  = signal<OpenFinanceAccount[]>([]);
  readonly status       = signal<IntegrationStatus>({ extrato: false, pagamentos: false });
  readonly banner       = signal<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  readonly busy         = signal(false);
  readonly showPay      = signal(false);

  form = this.fb.group({
    method:         ['PIX', Validators.required],
    amount:         [null as number | null, [Validators.required, Validators.min(0.01)]],
    payeeName:      [''],
    payeeDocument:  [''],
    payeeKeyOrLine: [''],
    description:    [''],
    bankAccountId:  [null as number | null],
  });

  ngOnInit(): void {
    this.svc.getIntegrationStatus().subscribe({ next: s => this.status.set(s), error: () => {} });
    this.load();
    this.loadConnections();
  }

  payStatus(s: BankPaymentStatus) { return PAY_STATUS[s] ?? { label: s, variant: 'info' as Variant }; }

  load(): void {
    this.loading.set(true);
    this.svc.listPayments({ take: '200' }).subscribe({
      next: p => { this.payments.set(p ?? []); this.loading.set(false); },
      error: () => { this.payments.set([]); this.loading.set(false); },
    });
  }

  loadConnections(): void {
    this.svc.listConnections().subscribe({ next: c => this.connections.set(c ?? []), error: () => {} });
  }

  openPay(): void { this.banner.set(null); this.showPay.set(true); }
  closePay(): void { this.showPay.set(false); }

  submitPay(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true);
    const v = this.form.value;
    this.svc.createPayment({
      method:         v.method as any,
      amount:         Number(v.amount),
      payeeName:      v.payeeName || undefined,
      payeeDocument:  (v.payeeDocument || '').replace(/\D/g, '') || undefined,
      payeeKeyOrLine: v.payeeKeyOrLine || undefined,
      description:    v.description || undefined,
      bankAccountId:  v.bankAccountId ? Number(v.bankAccountId) : undefined,
    }).subscribe({
      next: () => { this.busy.set(false); this.showPay.set(false); this.form.reset({ method: 'PIX' }); this.banner.set({ kind: 'ok', msg: 'Ordem de pagamento criada.' }); this.load(); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao criar a ordem de pagamento.' }); },
    });
  }

  refresh(o: BankPaymentOrder): void {
    this.svc.refreshPayment(o.id).subscribe({ next: () => this.load(), error: () => {} });
  }

  cancel(o: BankPaymentOrder): void {
    this.svc.cancelPayment(o.id).subscribe({
      next: () => { this.banner.set({ kind: 'ok', msg: `Ordem #${o.id} cancelada.` }); this.load(); },
      error: err => this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao cancelar.' }),
    });
  }

  syncStatement(): void {
    this.busy.set(true); this.banner.set(null);
    this.svc.syncStatement({}).subscribe({
      next: r => { this.busy.set(false); this.banner.set({ kind: 'ok', msg: `Extrato sincronizado: ${r.imported} lançamento(s) importado(s).` }); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao sincronizar o extrato.' }); },
    });
  }

  connect(): void {
    this.busy.set(true); this.banner.set(null);
    this.svc.connectAccount({}).subscribe({
      next: () => { this.busy.set(false); this.banner.set({ kind: 'ok', msg: 'Conexão Open Finance registrada (aguardando consentimento).' }); this.loadConnections(); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao conectar a conta.' }); },
    });
  }
}
