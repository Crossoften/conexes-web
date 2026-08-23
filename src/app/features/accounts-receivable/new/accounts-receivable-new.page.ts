// src/app/features/accounts-receivable/new/accounts-receivable-new.page.ts
// FA-09: cadastro manual de conta a receber (doações/repasses/receitas sem nota).
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AccountsReceivableService } from '../accounts-receivable.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-accounts-receivable-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './accounts-receivable-new.page.html',
  styleUrl: './accounts-receivable-new.page.scss',
})
export class AccountsReceivableNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private http   = inject(HttpClient);
  private svc    = inject(AccountsReceivableService);
  private notify = inject(NotificationService);

  readonly saving   = signal(false);
  readonly clientes = signal<{ id: number; nome: string }[]>([]);

  form = this.fb.group({
    stakeholderId: ['', Validators.required],
    invoiceNumber: [''],
    description:   [''],
    issueDate:     ['', Validators.required],
    dueDate:       ['', Validators.required],
    amount:        ['', Validators.required],
  });

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/v1/stakeholders?take=1000`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.clientes.set(list.map((s) => ({ id: s.id, nome: s.name ?? s.tradeName ?? `#${s.id}` })));
      },
      error: () => {},
    });
  }

  /** Interpreta valor no padrão brasileiro ("1.000,00" → 1000). */
  private parseMoney(value: any): number {
    const s = String(value ?? '').trim();
    if (!s) return 0;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = el.value.replace(/[^\d.,]/g, '');
    this.form.get('amount')?.setValue(el.value, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios: cliente, datas e valor.');
      return;
    }
    const v = this.form.value;
    const payload = {
      stakeholderId: Number(v.stakeholderId),
      issueDate:     v.issueDate,
      dueDate:       v.dueDate,
      amount:        this.parseMoney(v.amount),
      description:   v.description || undefined,
      invoiceNumber: v.invoiceNumber || undefined,
      status:        'Open',
    };
    this.saving.set(true);
    this.svc.create(payload).subscribe({
      next: () => {
        this.notify.success('Conta a receber cadastrada com sucesso.');
        this.router.navigate(['/accounts-receivable']);
      },
      error: (err) => {
        this.saving.set(false);
        const m = err?.error?.message;
        this.notify.error(Array.isArray(m) ? m.join(', ') : (m || 'Não foi possível salvar a conta a receber.'));
      },
    });
  }
}
