// src/app/features/integrations/fiscal/fiscal-documents.page.ts
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [NgClass, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './fiscal-documents.page.html',
  styleUrls: ['../integrations.shared.scss'],
})
export class FiscalDocumentsPage implements OnInit {
  private svc = inject(IntegrationsService);
  private fb  = inject(FormBuilder);
  private http = inject(HttpClient);

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
  }

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

  syncNfse(): void {
    this.busy.set(true); this.banner.set(null);
    this.svc.syncNfseInbound().subscribe({
      next: r => { this.busy.set(false); this.banner.set({ kind: 'ok', msg: `Sincronização concluída: ${r.imported} nota(s) recebida(s) importada(s).` }); this.load(); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao sincronizar as notas recebidas.' }); },
    });
  }

  enableNfse(): void {
    this.busy.set(true); this.banner.set(null);
    this.svc.enableNfseInbound().subscribe({
      next: () => { this.busy.set(false); this.banner.set({ kind: 'ok', msg: 'Captura de NFS-e habilitada no provedor.' }); },
      error: err => { this.busy.set(false); this.banner.set({ kind: 'err', msg: err?.error?.message ?? 'Falha ao habilitar a captura.' }); },
    });
  }
}
