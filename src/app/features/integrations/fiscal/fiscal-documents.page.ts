// src/app/features/integrations/fiscal/fiscal-documents.page.ts
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { IntegrationsService } from '../integrations.service';
import { FiscalDocument, FiscalStatus } from '../integrations.model';

interface ContatoOption { id: number; name: string; document: string; }

type StatusVariant = 'success' | 'warning' | 'danger' | 'info';

const STATUS_CFG: Record<FiscalStatus, { label: string; variant: StatusVariant }> = {
  Pending:    { label: 'Pendente',    variant: 'info' },
  Processing: { label: 'Processando', variant: 'warning' },
  Issued:     { label: 'Emitida',     variant: 'success' },
  Failed:     { label: 'Falhou',      variant: 'danger' },
  Cancelled:  { label: 'Cancelada',   variant: 'danger' },
  Received:   { label: 'Recebida',    variant: 'success' },
};

const TYPE_LABEL: Record<string, string> = {
  NFE_PRODUTO:  'NF-e Produto',
  NFSE_SERVICO: 'NFS-e Serviço',
  NFE_INBOUND:  'NF-e Recebida',
  NFSE_INBOUND: 'NFS-e Recebida',
};

@Component({
  selector: 'app-fiscal-documents',
  standalone: true,
  // D3/I031-I032: FormsModule para o intervalo da sincronização; RouterLink para
  // o atalho à origem única da configuração (Configurações gerais).
  imports: [NgClass, DatePipe, DecimalPipe, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './fiscal-documents.page.html',
  styleUrls: ['../integrations.shared.scss'],
})
export class FiscalDocumentsPage implements OnInit {
  private svc = inject(IntegrationsService);
  private fb  = inject(FormBuilder);
  private http = inject(HttpClient);
  // I033: a emissão pode chegar de Contas a receber, com os dados do título.
  private route = inject(ActivatedRoute);

  // IT-09: contatos (clientes) para autofill do tomador na emissão de NFS-e.
  readonly contatos = signal<ContatoOption[]>([]);
  loadContatos(): void {
    this.http.get<{ data?: any[] } | any[]>(`${environment.apiUrl}/v1/stakeholders`, { params: { take: '500' } })
      .subscribe({
        next: res => {
          const rows = Array.isArray(res) ? res : (res.data ?? []);
          this.contatos.set(rows.map(r => ({ id: Number(r.id), name: String(r.name ?? r.tradeName ?? r.legalName ?? ''), document: String(r.document ?? '') })));
        },
        error: () => {},
      });
  }
  onSelectContato(id: string): void {
    const c = this.contatos().find(x => String(x.id) === String(id));
    if (!c) return;
    this.form.patchValue({ borrowerName: c.name, borrowerDoc: (c.document || '').replace(/\D/g, '') });
  }
  onBorrowerDocBlur(): void {
    const digits = (this.form.get('borrowerDoc')?.value ?? '').replace(/\D/g, '');
    // já cadastrado em Contatos?
    const known = this.contatos().find(x => (x.document || '').replace(/\D/g, '') === digits);
    if (known) { if (!this.form.get('borrowerName')?.value) this.form.get('borrowerName')?.setValue(known.name); return; }
    // senão, se CNPJ, consulta a Receita
    if (digits.length === 14 && !this.form.get('borrowerName')?.value) {
      this.http.get<any>(`${environment.apiUrl}/v1/stakeholders/cnpj/${digits}`).subscribe({
        next: d => { if (d?.razaoSocial) this.form.get('borrowerName')?.setValue(d.razaoSocial); },
        error: () => {},
      });
    }
  }

  readonly loading   = signal(true);
  readonly docs      = signal<FiscalDocument[]>([]);
  readonly count     = signal(0);
  readonly company   = signal<any | null>(null);
  readonly banner    = signal<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  readonly busy      = signal(false);
  readonly showEmit  = signal(false);

  readonly filterType      = signal('');
  readonly filterDirection = signal('');

  readonly companyName = computed(() => {
    const c = this.company();
    return c?.companies?.name ?? c?.name ?? null;
  });

  form = this.fb.group({
    externalId:      ['', Validators.required],
    description:     ['', Validators.required],
    servicesAmount:  [null as number | null, [Validators.required, Validators.min(0.01)]],
    cityServiceCode: ['', Validators.required],
    borrowerName:    [''],
    borrowerDoc:     [''],
  });

  ngOnInit(): void {
    this.load();
    this.loadContatos();
    this.svc.getCompany().subscribe({ next: c => this.company.set(c), error: () => {} });

    /**
     * COM-Emitir / I033 (decisão D3): a emissão parte de Contas a receber, contra
     * uma receita. Quando se chega por ali, o formulário abre já preenchido com os
     * dados do título — o que falta é só o dado fiscal, que é de quem emite.
     * Nada é transmitido sem a confirmação dele.
     */
    const q = this.route.snapshot.queryParamMap;
    if (q.get('emitir')) {
      const idReceita = q.get('receivableId');
      this.form.patchValue({
        externalId:   idReceita ? `AR-${idReceita}` : '',
        description:  q.get('descricao') ?? '',
        servicesAmount: q.get('valor') ? Number(q.get('valor')) : null,
        borrowerName: q.get('tomador') ?? '',
        borrowerDoc:  q.get('documento') ?? '',
      });
      this.origemReceita.set(idReceita);
      this.showEmit.set(true);
    }
  }

  /** I033: de qual conta a receber veio esta emissão (para a tela dizer). */
  readonly origemReceita = signal<string | null>(null);

  statusCfg(s: FiscalStatus) { return STATUS_CFG[s] ?? { label: s, variant: 'info' as StatusVariant }; }
  typeLabel(t: string) { return TYPE_LABEL[t] ?? t; }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string> = { take: '200' };
    if (this.filterType())      params['type'] = this.filterType();
    if (this.filterDirection()) params['direction'] = this.filterDirection();
    this.svc.listDocuments(params).subscribe({
      next: res => { this.docs.set(res.data ?? []); this.count.set(res.count ?? 0); this.loading.set(false); },
      error: () => { this.docs.set([]); this.loading.set(false); },
    });
  }

  onFilterType(v: string)      { this.filterType.set(v); this.load(); }
  onFilterDirection(v: string) { this.filterDirection.set(v); this.load(); }

  openEmit(): void { this.banner.set(null); this.showEmit.set(true); }
  closeEmit(): void { this.showEmit.set(false); }

  submitEmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true);
    const v = this.form.value;
    this.svc.emitServiceInvoice({
      externalId:      v.externalId!,
      description:     v.description!,
      servicesAmount:  Number(v.servicesAmount),
      cityServiceCode: v.cityServiceCode!,
      borrower: (v.borrowerName || v.borrowerDoc) ? { name: v.borrowerName || undefined, federalTaxNumber: (v.borrowerDoc || '').replace(/\D/g, '') || undefined } : undefined,
    }).subscribe({
      next: () => { this.busy.set(false); this.showEmit.set(false); this.form.reset(); this.banner.set({ kind: 'ok', msg: 'NFS-e enviada para emissão.' }); this.load(); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao emitir a NFS-e.' }); },
    });
  }

  // ── COM-Sincronizar / I032 (decisão D3): a sincronização PEDE INTERVALO ────
  // Antes o botão trazia "as últimas 20" e ninguém sabia de qual período.
  periodoDe = '';
  periodoAte = '';
  get periodoInvalido(): boolean {
    return !!this.periodoDe && !!this.periodoAte && this.periodoDe > this.periodoAte;
  }
  get periodoIncompleto(): boolean { return !this.periodoDe || !this.periodoAte; }

  syncNfse(): void {
    if (this.periodoIncompleto) {
      this.banner.set({ kind: 'err', msg: 'Informe o período (data inicial e final) para sincronizar as notas recebidas.' });
      return;
    }
    if (this.periodoInvalido) {
      this.banner.set({ kind: 'err', msg: 'A data inicial não pode ser depois da data final.' });
      return;
    }
    this.busy.set(true); this.banner.set(null);
    this.svc.syncNfseInboundPeriodo(this.periodoDe, this.periodoAte).subscribe({
      next: r => {
        this.busy.set(false);
        const fora = r.descartadas ? ` ${r.descartadas} nota(s) fora do período foram ignoradas.` : '';
        this.banner.set({ kind: 'ok', msg: `Sincronização de ${this.dataBR(this.periodoDe)} a ${this.dataBR(this.periodoAte)}: ${r.imported} nota(s) recebida(s) importada(s).${fora}` });
        this.load();
      },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao sincronizar as notas recebidas.' }); },
    });
  }

  dataBR(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  }

  enableNfse(): void {
    this.busy.set(true); this.banner.set(null);
    this.svc.enableNfseInbound().subscribe({
      next: () => { this.busy.set(false); this.banner.set({ kind: 'ok', msg: 'Captura de NFS-e habilitada no provedor.' }); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao habilitar a captura.' }); },
    });
  }
}
