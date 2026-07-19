// src/app/features/taxes/new/taxes-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { TaxesService } from '../taxes.service';
import { TaxPayload, TaxService, ScopeOption } from '../taxes.model';

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
    return this.ALIQUOT_FIELDS.reduce((sum, k) => sum + (Number(v[k]) || 0), 0);
  }

  ngOnInit(): void {
    // Atualiza o "Total das Retenções" (campo calculado) ao alterar as alíquotas.
    this.form.valueChanges.subscribe(() => {
      this.form.get('resumoRetencoes')?.setValue(this.computeTotal(), { emitEvent: false });
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
      next: (s: any) => {
        const t = s?.taxesAndServices;
        if (!t) return;
        this.form.patchValue({
          codigoServico:    t.serviceClassCode || this.form.get('codigoServico')?.value || '',
          tituloServico:    t.serviceTitle     || this.form.get('tituloServico')?.value || '',
          naturezaOperacao: t.operationNature  ?? '',
          aliqIRRF:   t.irfAliquot    ?? '',
          irfCode:    t.irfCode       ?? '',
          aliqPIS:    t.pisAliquot    ?? '',
          pisCode:    t.pisCode       ?? '',
          aliqPCC:    t.pccAliquot    ?? '',
          pccCode:    t.pccCode       ?? '',
          aliqCOFINS: t.cofinsAliquot ?? '',
          cofinsCode: t.cofinsCode    ?? '',
          aliqINSS:   t.inssAliquot   ?? '',
          inssCode:   t.inssCode      ?? '',
          aliqCSLL:   t.csllAliquot   ?? '',
          csllCode:   t.csllCode      ?? '',
          aliqISS:    t.issAliquot    ?? '',
          issCode:    t.issCode       ?? '',
          aliqIBS:    t.ibsAliquot    ?? '',
          ibsCode:    t.ibsCode       ?? '',
          aliqCBS:    t.cbsAliquot    ?? '',
          cbsCode:    t.cbsCode       ?? '',
        });
      },
      error: () => { /* fornecedor sem impostos: mantém o formulário como está */ },
    });
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
      irfAliquot:      Number(v.aliqIRRF)              || 0,
      irfCode:         v.irfCode                       ?? '',
      pisAliquot:      Number(v.aliqPIS)               || 0,
      pisCode:         v.pisCode                       ?? '',
      pccAliquot:      Number(v.aliqPCC)               || 0,
      pccCode:         v.pccCode                       ?? '',
      cofinsAliquot:   Number(v.aliqCOFINS)            || 0,
      cofinsCode:      v.cofinsCode                    ?? '',
      inssAliquot:     Number(v.aliqINSS)              || 0,
      inssCode:        v.inssCode                      ?? '',
      csllAliquot:     Number(v.aliqCSLL)              || 0,
      csllCode:        v.csllCode                      ?? '',
      issAliquot:      Number(v.aliqISS)               || 0,
      issCode:         v.issCode                       ?? '',
      ibsAliquot:      Number(v.aliqIBS)               || 0,
      ibsCode:         v.ibsCode                       ?? '',
      cbsAliquot:      Number(v.aliqCBS)               || 0,
      cbsCode:         v.cbsCode                       ?? '',
      status:          'Active',
      services:        this.normalizeServices(this.services),
    };

    this.svc.save(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/taxes']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
