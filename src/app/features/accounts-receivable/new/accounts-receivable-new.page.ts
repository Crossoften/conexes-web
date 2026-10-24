// src/app/features/accounts-receivable/new/accounts-receivable-new.page.ts
// FA-09: cadastro manual de conta a receber (doações/repasses/receitas sem nota).
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);
  private svc    = inject(AccountsReceivableService);
  private notify = inject(NotificationService);

  readonly saving   = signal(false);
  readonly clientes = signal<{ id: number; nome: string }[]>([]);
  readonly termos   = signal<{ id: number; nome: string }[]>([]);

  /** CR-04: a tela serve cadastro e edição — a ação Editar não tinha destino. */
  readonly editandoId = signal<number | null>(null);
  readonly ehEdicao   = computed(() => this.editandoId() !== null);

  /** Situações que a tela permite escolher na edição. */
  readonly statusOptions = [
    { value: 'Open',          label: 'Em aberto' },
    { value: 'PartiallyPaid', label: 'Parcialmente recebido' },
    { value: 'Paid',          label: 'Recebido' },
    { value: 'Cancelled',     label: 'Cancelado' },
  ];

  form = this.fb.group({
    stakeholderId: ['', Validators.required],
    invoiceNumber: [''],
    // CR-04: a coluna `document` existe no registro e a exportação já a lista,
    // mas o formulário não oferecia como preenchê-la.
    document:      [''],
    description:   [''],
    issueDate:     ['', Validators.required],
    dueDate:       ['', Validators.required],
    amount:        ['', Validators.required],
    // CR-04: vínculo com o termo/parceria, que o registro suporta.
    partnershipId: [''],
    status:        ['Open'],
  });

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/v1/stakeholders?take=1000`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.clientes.set(list.map((s) => ({ id: s.id, nome: s.name ?? s.tradeName ?? `#${s.id}` })));
      },
      error: () => {},
    });
    // CR-04: termos/parcerias para o vínculo.
    this.http.get<any>(`${environment.apiUrl}/v1/partnerships?take=500`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.termos.set(list.map((t) => ({
          id: t.id,
          nome: [t.termNumber ?? t.number, t.title ?? t.name].filter(Boolean).join(' — ') || `Termo #${t.id}`,
        })));
      },
      error: () => this.termos.set([]),
    });

    // CR-04: com id na rota, carrega o título para edição.
    const id = this.route.snapshot.paramMap.get('id');
    if (id && !isNaN(Number(id))) {
      this.editandoId.set(Number(id));
      this.carregarParaEdicao(Number(id));
    }
  }

  /** CR-04: traz o título para o formulário, no mesmo desenho do CP-04. */
  private carregarParaEdicao(id: number): void {
    this.svc.getById(id).subscribe({
      next: (r: any) => {
        const dia = (v: any) => (v ? String(v).slice(0, 10) : '');
        const dinheiro = (v: any) =>
          v == null ? '' : Number(v).toFixed(2).replace('.', ',');
        this.form.patchValue({
          stakeholderId: r.stakeholderId != null ? String(r.stakeholderId) : '',
          invoiceNumber: r.invoiceNumber ?? '',
          document:      r.document ?? '',
          description:   r.description ?? '',
          issueDate:     dia(r.issueDate),
          dueDate:       dia(r.dueDate),
          amount:        dinheiro(r.amount),
          partnershipId: r.partnershipId != null ? String(r.partnershipId) : '',
          status:        r.status ?? 'Open',
        });
      },
      error: () => this.notify.error('Não foi possível carregar a conta a receber.'),
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
    const payload: Record<string, unknown> = {
      stakeholderId: Number(v.stakeholderId),
      issueDate:     v.issueDate,
      dueDate:       v.dueDate,
      amount:        this.parseMoney(v.amount),
      description:   v.description || undefined,
      invoiceNumber: v.invoiceNumber || undefined,
      document:      v.document || undefined,
      status:        v.status || 'Open',
    };
    if (v.partnershipId) payload['partnershipId'] = Number(v.partnershipId);

    this.saving.set(true);
    const id = this.editandoId();
    // CR-04: PATCH envia só o que a tela edita — recebimentos e parcelas do
    // título não são tocados, igual ao desenho do CP-04.
    const requisicao = id === null
      ? this.svc.create(payload)
      : this.svc.update(id, payload);

    requisicao.subscribe({
      next: () => {
        this.notify.success(id === null
          ? 'Conta a receber cadastrada com sucesso.'
          : 'Conta a receber atualizada com sucesso.');
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
