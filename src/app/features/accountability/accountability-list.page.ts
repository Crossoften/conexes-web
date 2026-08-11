// src/app/features/accountability/accountability-list.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { AccountabilityService } from './accountability.service';
import { AccountabilityListItem, ACC_STATUS_LABEL, PartnershipOption } from './accountability.model';
import { NotificationService } from '../../shared/services/notification.service';

@Component({
  selector: 'app-accountability-list',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './accountability-list.page.html',
  styleUrl: './accountability-list.page.scss',
})
export class AccountabilityListPage implements OnInit {
  private svc = inject(AccountabilityService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  readonly loading = signal(false);
  readonly items = signal<AccountabilityListItem[]>([]);
  readonly statusConfig = ACC_STATUS_LABEL;

  // Modal "novo processo"
  readonly modalOpen = signal(false);
  readonly partnerships = signal<PartnershipOption[]>([]);
  readonly saving = signal(false);
  form = { partnershipId: '', title: '', periodStart: '', periodEnd: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: v => { this.items.set(v); this.loading.set(false); },
      error: () => { this.items.set([]); this.loading.set(false); this.notify.error('Não foi possível carregar as prestações de contas.'); },
    });
  }

  openNew(): void {
    this.form = { partnershipId: '', title: '', periodStart: '', periodEnd: '' };
    this.modalOpen.set(true);
    this.svc.partnerships().subscribe({ next: v => this.partnerships.set(v), error: () => {} });
  }

  closeNew(): void { this.modalOpen.set(false); }

  save(): void {
    if (!this.form.partnershipId || !this.form.title) {
      this.notify.error('Escolha a parceria e informe um título.');
      return;
    }
    this.saving.set(true);
    this.svc.create({
      partnershipId: Number(this.form.partnershipId),
      title: this.form.title,
      periodStart: this.form.periodStart || undefined,
      periodEnd: this.form.periodEnd || undefined,
    }).subscribe({
      next: (proc: any) => {
        this.saving.set(false); this.modalOpen.set(false);
        this.notify.success('Prestação de contas criada.');
        this.router.navigate(['/accountability', proc.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err?.error?.message ?? 'Erro ao criar a prestação de contas.');
      },
    });
  }

  open(id: number): void { this.router.navigate(['/accountability', id]); }
}
