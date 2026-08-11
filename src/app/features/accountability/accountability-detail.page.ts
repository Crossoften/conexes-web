// src/app/features/accountability/accountability-detail.page.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AccountabilityService } from './accountability.service';
import { AccountabilityDetail, ACC_STATUS_LABEL, ITEM_STATUS_LABEL } from './accountability.model';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-accountability-detail',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './accountability-detail.page.html',
  styleUrl: './accountability-detail.page.scss',
})
export class AccountabilityDetailPage implements OnInit {
  private svc = inject(AccountabilityService);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly data = signal<AccountabilityDetail | null>(null);
  readonly statusConfig = ACC_STATUS_LABEL;
  readonly itemStatus = ITEM_STATUS_LABEL;

  private id = 0;

  readonly total = computed(() => (this.data()?.items ?? []).reduce((s, i) => s + (i.payment?.grossAmount ?? 0), 0));
  readonly validatedCount = computed(() => (this.data()?.items ?? []).filter(i => i.status === 'Validated').length);
  readonly canApprove = computed(() => {
    const d = this.data();
    return !!d && d.status !== 'Approved' && d.items.length > 0 && d.items.every(i => i.status === 'Validated');
  });

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getById(this.id).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Não foi possível carregar a prestação.'); },
    });
  }

  brl(v: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
  }
  date(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  }

  validate(itemId: number): void {
    this.svc.validateItem(itemId, { cndOk: true, rubricaOk: true }).subscribe({
      next: () => { this.notify.success('Item validado.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao validar.'),
    });
  }

  returnItem(itemId: number): void {
    const reason = window.prompt('Motivo da devolução do item:');
    if (!reason) return;
    this.svc.returnItem(itemId, reason).subscribe({
      next: () => { this.notify.info('Item devolvido.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao devolver.'),
    });
  }

  approve(): void {
    this.svc.approve(this.id).subscribe({
      next: () => { this.notify.success('Prestação de contas aprovada.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message ?? 'Erro ao aprovar.'),
    });
  }

  downloadReport(): void {
    this.svc.downloadReport(this.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `prestacao-contas-${this.id}.pdf`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Não foi possível gerar o PDF.'),
    });
  }
}
