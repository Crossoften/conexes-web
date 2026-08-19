// src/app/features/taxes/new/taxes-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { TaxesService } from '../taxes.service';
import { TaxPayload, TaxService, ScopeOption } from '../taxes.model';
import { parseDecimalBR, formatDecimalBR } from '../../../shared/utils/format';
import { NotificationService } from '../../../shared/services/notification.service';

type TaxTab = 'CONFIG' | 'ALIQUOTAS' | 'SERVICOS';

interface StakeholderItem { id: number; name: string; document: string; }

@Component({
  selector: 'app-taxes-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, NgClass],
  templateUrl: './taxes-new.page.html',
  styleUrl: './taxes-new.page.scss',
})
export class TaxesNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(TaxesService);
  private notify = inject(NotificationService);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly stakeholders = signal<StakeholderItem[]>([]);
  readonly loadingLists = signal(true);

  // Opções de escopo para os selects do serviço (evitam id inválido digitado à mão).
  readonly costCenters = signal<ScopeOption[]>([]);
  readonly projects    = signal<ScopeOption[]>([]);
  readonly activities  = signal<ScopeOption[]>([]);

  activeTab: TaxTab = 'CONFIG';

  // Services gerenciados como array dinâmico
  services: TaxService[] = [];
  newService: Partial<TaxService> = this.emptyService();

  private emptyService(): Partial<TaxService> {
    return {
      name: '', description: '', externalCode: '',
      grantorOrgan: '', hasRetention: false,
      accessorOrgan: '', concessionLink: '',
      costCenterId: null, projectId: null, activityId: null,
    };
  }

  /** FK do serviço: id positivo ou null (o back rejeita 0/"" como referência inexistente). */
  private idOrNull(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private normalizeServices(list: TaxService[]): TaxService[] {
    return list.map(s => ({
      ...s,
      costCenterId: this.idOrNull(s.costCenterId),
      projectId:    this.idOrNull(s.projectId),
      activityId:   this.idOrNull(s.activityId),
    }));
  }

  form: FormGroup = this.fb.group({
    fornecedor:              ['', Validators.required],
    codigoServico:           ['', Validators.required],
    tituloServico:           ['', Validators.required],
    naturezaOperacao:        [''],
    definirAliquotasManual:  [false],
    resumoRetencoes:         [{ value: '', disabled: true }],
    aliqIRRF:   [''], irfCode:    [''],
    aliqPIS:    [''], pisCode:    [''],
    aliqPCC:    [''], pccCode:    [''],
    aliqCOFINS: [''], cofinsCode: [''],
    aliqINSS:   [''], inssCode:   [''],
    aliqCSLL:   [''], csllCode:   [''],
    aliqISS:    [''], issCode:    [''],
    aliqIBS:    [''], ibsCode:    [''],
    aliqCBS:    [''], cbsCode:    [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  // Campos de alíquota que compõem o Total das Retenções (soma simples).
  private readonly ALIQUOT_FIELDS = [
    'aliqIRRF', 'aliqPIS', 'aliqPCC', 'aliqCOFINS',
    'aliqINSS', 'aliqCSLL', 'aliqISS', 'aliqIBS', 'aliqCBS',
  ];

  computeTotal(): number {
    const v = this.form.getRawValue();
    return this.ALIQUOT_FIELDS.reduce((sum, k) => sum + parseDecimalBR(v[k]), 0);
  }

  ngOnInit(): void {
    // Atualiza o "Total das Retenções" (campo calculado) ao alterar as alíquotas.
    this.form.valueChanges.subscribe(() => {
      this.form.get('resumoRetencoes')?.setValue(formatDecimalBR(this.computeTotal()), { emitEvent: false });
    });

    this.svc.getStakeholders().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        const mapped = list.map((s: any) => ({
          id:       s.id,
          name:     s.name ?? s.tradeName ?? s.legalName ?? '',
          document: s.document ?? s.cnpj ?? '',
        }));
        this.stakeholders.set(mapped);
        this.loadingLists.set(false);
      },
      error: () => this.loadingLists.set(false),
    });

    this.svc.getScopeOptions().subscribe({
      next: opts => {
        this.costCenters.set(opts.costCenters);
        this.projects.set(opts.projects);
        this.activities.set(opts.activities);
      },
      error: () => { /* mantém selects vazios se a lista falhar */ },
    });
  }

  // ── Sincronização com o cadastro do fornecedor ────────────────────────────
  // Ao selecionar o fornecedor, traz os impostos já preenchidos no cadastro dele
  // (stakeholder.taxesAndServices). Não sobrescreve se o fornecedor não tiver.
  onSupplierChange(value: string | number): void {
    const id = Number(value);
    if (!id) return;
    this.svc.getStakeholderById(id).subscribe({
      next: (s: any) => this.applyTaxConfig(s?.taxesAndServices, false),
      error: () => { /* fornecedor sem impostos: mantém o formulário como está */ },
    });
  }

  // STK-04.1: copia a configuração de impostos/serviços de OUTRO fornecedor.
  copyFrom: number | string = '';
  readonly copying = signal(false);

  onCopyFromSupplier(value: string | number): void {
    const id = Number(value);
    if (!id) return;
    if (this.form.dirty && !confirm('Isso vai substituir as alíquotas e a lista de serviços atuais. Continuar?')) {
      this.copyFrom = '';
      return;
    }
    this.copying.set(true);
    this.svc.getByStakeholder(id).subscribe({
      next: (t: any) => {
        this.copying.set(false);
        if (!t || !t.serviceClassCode && !t.services?.length && !t.irfAliquot) {
          this.notify.error('Esse fornecedor não tem impostos/serviços cadastrados para copiar.');
          return;
        }
        this.applyTaxConfig(t, true);
        this.notify.success('Impostos e serviços copiados. Ajuste o que precisar antes de salvar.');
        this.copyFrom = '';
      },
      error: () => { this.copying.set(false); this.notify.error('Esse fornecedor não tem impostos/serviços para copiar.'); this.copyFrom = ''; },
    });
  }

  // Aplica uma config fiscal (do próprio fornecedor ou copiada de outro) ao form.
  // `overwriteServices`: quando true (cópia), substitui a lista mesmo se vazia.
  private applyTaxConfig(t: any, overwriteServices: boolean): void {
    if (!t) return;
    this.form.patchValue({
      codigoServico:    t.serviceClassCode || this.form.get('codigoServico')?.value || '',
      tituloServico:    t.serviceTitle     || this.form.get('tituloServico')?.value || '',
      naturezaOperacao: t.operationNature  ?? '',
      aliqIRRF:   t.irfAliquot    ?? '', irfCode:    t.irfCode    ?? '',
      aliqPIS:    t.pisAliquot    ?? '', pisCode:    t.pisCode    ?? '',
      aliqPCC:    t.pccAliquot    ?? '', pccCode:    t.pccCode    ?? '',
      aliqCOFINS: t.cofinsAliquot ?? '', cofinsCode: t.cofinsCode ?? '',
      aliqINSS:   t.inssAliquot   ?? '', inssCode:   t.inssCode   ?? '',
      aliqCSLL:   t.csllAliquot   ?? '', csllCode:   t.csllCode   ?? '',
      aliqISS:    t.issAliquot    ?? '', issCode:    t.issCode    ?? '',
      aliqIBS:    t.ibsAliquot    ?? '', ibsCode:    t.ibsCode    ?? '',
      aliqCBS:    t.cbsAliquot    ?? '', cbsCode:    t.cbsCode    ?? '',
    });
    // STK-04.4/STK-04.3: traz também a lista de serviços (strip de ids, preserva escopo).
    if (overwriteServices || (Array.isArray(t.services) && t.services.length)) {
      this.services = (t.services ?? []).map((sv: any) => ({
        name:          sv.name          ?? '',
        description:   sv.description   ?? '',
        externalCode:  sv.externalCode  ?? '',
        grantorOrgan:  sv.grantorOrgan  ?? '',
        hasRetention:  !!sv.hasRetention,
        accessorOrgan: sv.accessorOrgan ?? '',
        costCenterId:  this.idOrNull(sv.costCenterId),
        projectId:     this.idOrNull(sv.projectId),
        activityId:    this.idOrNull(sv.activityId),
      }));
    }
  }

  /** Fornecedores disponíveis como origem da cópia (exclui o destino já selecionado). */
  copySourceOptions(): StakeholderItem[] {
    const target = Number(this.form.get('fornecedor')?.value);
    return this.stakeholders().filter(s => s.id !== target);
  }

  // ── Services array ────────────────────────────────────────────────────────

  addService(): void {
    if (!this.newService.name?.trim()) return;
    this.services = [...this.services, { ...this.newService } as TaxService];
    this.newService = this.emptyService();
  }

  removeService(index: number): void {
    this.services = this.services.filter((_, i) => i !== index);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  setTab(tab: TaxTab): void { this.activeTab = tab; }

  resetForm(): void {
    this.form.reset({ definirAliquotasManual: false });
    this.services   = [];
    this.newService = this.emptyService();
    this.activeTab  = 'CONFIG';
    this.errorMsg.set(null);
  }

  onNextOrSubmit(): void {
    if (this.activeTab === 'CONFIG') {
      this.activeTab = 'ALIQUOTAS';
    } else if (this.activeTab === 'ALIQUOTAS') {
      this.activeTab = 'SERVICOS';
    } else {
      this.onSubmit();
    }
  }

  private onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // IMP-05: feedback consistente também quando falta campo obrigatório.
      this.notify.error('Preencha os campos obrigatórios antes de salvar.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: TaxPayload = {
      stakeholderId:   Number(v.fornecedor)            || 0,
      serviceClassCode: v.codigoServico                ?? '',
      serviceTitle:    v.tituloServico                 ?? '',
      operationNature: v.naturezaOperacao              ?? '',
      totalRetentions: this.computeTotal(),
      manualAliquots:  !!v.definirAliquotasManual,
      irfAliquot:      parseDecimalBR(v.aliqIRRF),
      irfCode:         v.irfCode                       ?? '',
      pisAliquot:      parseDecimalBR(v.aliqPIS),
      pisCode:         v.pisCode                       ?? '',
      pccAliquot:      parseDecimalBR(v.aliqPCC),
      pccCode:         v.pccCode                       ?? '',
      cofinsAliquot:   parseDecimalBR(v.aliqCOFINS),
      cofinsCode:      v.cofinsCode                    ?? '',
      inssAliquot:     parseDecimalBR(v.aliqINSS),
      inssCode:        v.inssCode                      ?? '',
      csllAliquot:     parseDecimalBR(v.aliqCSLL),
      csllCode:        v.csllCode                      ?? '',
      issAliquot:      parseDecimalBR(v.aliqISS),
      issCode:         v.issCode                       ?? '',
      ibsAliquot:      parseDecimalBR(v.aliqIBS),
      ibsCode:         v.ibsCode                       ?? '',
      cbsAliquot:      parseDecimalBR(v.aliqCBS),
      cbsCode:         v.cbsCode                       ?? '',
      status:          'Active',
      services:        this.normalizeServices(this.services),
    };

    this.svc.save(payload).subscribe({
      next: () => {
        this.loading.set(false);
        // IMP-05: feedback explícito de sucesso (antes só navegava, sem confirmar).
        this.notify.success('Serviço e retenções salvos com sucesso.');
        this.router.navigate(['/taxes']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        const text = Array.isArray(msg) ? msg.join(', ') : msg;
        this.errorMsg.set(text);
        this.notify.error(text);
      },
    });
  }
}
