// src/app/features/taxes/components/tax-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, SimpleChanges, inject, signal } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Tax, TaxPayload, TaxService, StakeholderItem, ScopeOption } from '../taxes.model';
import { parseDecimalBR, formatDecimalBR } from '../../../shared/utils/format';
import { TaxesService } from '../taxes.service';

type ModalTab = 'GERAIS' | 'ALIQUOTAS';

@Component({
  selector: 'app-tax-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, FormsModule, DecimalPipe],
  templateUrl: './tax-detail.modal.html',
  styleUrl: './tax-detail.modal.scss',
})
export class TaxDetailModalComponent implements OnChanges, OnInit {
  @Input() tax:          Tax | null          = null;
  @Input() stakeholders: StakeholderItem[]   = [];
  @Input() mode:         'view' | 'edit'     = 'view';
  @Input() saving        = false;
  @Input() error:        string | null       = null;

  @Output() close  = new EventEmitter<void>();
  @Output() edit   = new EventEmitter<void>();
  @Output() delete = new EventEmitter<Tax>();
  @Output() save   = new EventEmitter<TaxPayload>();

  activeTab: ModalTab = 'GERAIS';

  private svc = inject(TaxesService);

  // Naturezas de operação já cadastradas, para o select do modo edição.
  readonly operationNatures = signal<string[]>([]);

  // Opções de escopo para os selects do serviço.
  readonly costCenters = signal<ScopeOption[]>([]);
  readonly projects    = signal<ScopeOption[]>([]);
  readonly activities  = signal<ScopeOption[]>([]);

  form: FormGroup;

  // services dinâmicos no modo edição
  services: TaxService[] = [];
  newService: Partial<TaxService> = this.emptyService();

  // Campos de alíquota que compõem o Total das Retenções (soma simples).
  private readonly ALIQUOT_FIELDS = [
    'aliqIRRF', 'aliqPIS', 'aliqPCC', 'aliqCOFINS',
    'aliqINSS', 'aliqCSLL', 'aliqISS', 'aliqIBS', 'aliqCBS',
  ];

  computeTotal(): number {
    const v = this.form.getRawValue();
    return this.ALIQUOT_FIELDS.reduce((sum, k) => sum + parseDecimalBR(v[k]), 0);
  }

  hasRetencao(): boolean {
    return this.mode === 'edit'
      ? !!this.form.get('definirAliquotasManual')?.value
      : !!this.tax?.manualAliquots;
  }

  constructor(private fb: FormBuilder) {
    this.form = this.buildForm();
    // Atualiza o "Total das Retenções" ao alterar as alíquotas.
    this.form.valueChanges.subscribe(() => {
      this.form.get('resumoRetencoes')?.setValue(formatDecimalBR(this.computeTotal()), { emitEvent: false });
    });
    // Aba Alíquotas só fica acessível com o toggle de retenção marcado.
    this.form.get('definirAliquotasManual')?.valueChanges.subscribe(v => {
      if (this.mode === 'edit' && !v && this.activeTab === 'ALIQUOTAS') this.activeTab = 'GERAIS';
    });
  }

  ngOnInit(): void {
    this.svc.getOperationNatures().subscribe({
      next: natures => {
        this.operationNatures.set(natures);
        this.ensureNatureOption(this.form.get('naturezaOperacao')?.value);
      },
      error: () => { /* mantém o select só com a opção vazia se a lista falhar */ },
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tax'] && this.tax) {
      this.form.patchValue({
        fornecedor:             this.tax.stakeholderId,
        codigoServico:          this.tax.serviceClassCode,
        tituloServico:          this.tax.serviceTitle,
        naturezaOperacao:       this.tax.operationNature,
        descricao:              (this.tax.services ?? []).find(sv => sv.name === this.tax!.serviceTitle)?.description ?? '',
        definirAliquotasManual: this.tax.manualAliquots,
        resumoRetencoes:        formatDecimalBR(this.tax.totalRetentions),
        aliqIRRF:               this.tax.irfAliquot,
        irfCode:                this.tax.irfCode,
        aliqPIS:                this.tax.pisAliquot,
        pisCode:                this.tax.pisCode,
        aliqPCC:                this.tax.pccAliquot,
        pccCode:                this.tax.pccCode,
        aliqCOFINS:             this.tax.cofinsAliquot,
        cofinsCode:             this.tax.cofinsCode,
        aliqINSS:               this.tax.inssAliquot,
        inssCode:               this.tax.inssCode,
        aliqCSLL:               this.tax.csllAliquot,
        csllCode:               this.tax.csllCode,
        aliqISS:                this.tax.issAliquot,
        issCode:                this.tax.issCode,
        aliqIBS:                this.tax.ibsAliquot,
        ibsCode:                this.tax.ibsCode,
        aliqCBS:                this.tax.cbsAliquot,
        cbsCode:                this.tax.cbsCode,
      });
      this.ensureNatureOption(this.tax.operationNature);
      this.services = (this.tax.services ?? []).map(sv => ({
        name:           sv.name           ?? '',
        description:    sv.description    ?? '',
        externalCode:   sv.externalCode   ?? '',
        grantorOrgan:   sv.grantorOrgan   ?? '',
        hasRetention:   !!sv.hasRetention,
        accessorOrgan:  sv.accessorOrgan  ?? '',
        concessionLink: sv.concessionLink ?? '',
        costCenterId:   this.idOrNull(sv.costCenterId),
        projectId:      this.idOrNull(sv.projectId),
        activityId:     this.idOrNull(sv.activityId),
      }));
    }

    if (changes['mode']) {
      if (this.mode === 'view') {
        this.form.disable();
      } else {
        this.form.enable();
        this.form.get('resumoRetencoes')?.disable();
      }
    }

    if (!this.hasRetencao() && this.activeTab === 'ALIQUOTAS') this.activeTab = 'GERAIS';
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get stakeholderName(): string {
    if (!this.tax) return '—';
    const s = this.stakeholders.find(s => s.id === this.tax!.stakeholderId);
    return s ? `${s.name}` : String(this.tax.stakeholderId);
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  setTab(tab: ModalTab): void {
    if (tab === 'ALIQUOTAS' && !this.hasRetencao()) return;
    this.activeTab = tab;
  }

  onClose(): void { this.close.emit(); }

  onEdit(): void { this.edit.emit(); }

  onDelete(): void {
    if (this.tax) this.delete.emit(this.tax);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.tax) return;

    const v = this.form.getRawValue();

    // A Descrição persiste no serviço de mesmo nome do Título (único campo de
    // descrição que o contrato do back expõe — services[].description).
    const services = this.normalizeServices(this.services);
    const desc = (v.descricao ?? '').trim();
    if (desc) {
      const main = services.find(s => s.name === v.tituloServico);
      if (main) {
        main.description = desc;
      } else {
        services.unshift({
          name: v.tituloServico, description: desc, externalCode: '',
          grantorOrgan: '', hasRetention: !!v.definirAliquotasManual,
          accessorOrgan: '', concessionLink: '',
          costCenterId: null, projectId: null, activityId: null,
        });
      }
    }

    const payload: TaxPayload = {
      stakeholderId:    Number(v.fornecedor)           || this.tax.stakeholderId,
      serviceClassCode: v.codigoServico                ?? this.tax.serviceClassCode,
      serviceTitle:     v.tituloServico                ?? this.tax.serviceTitle,
      operationNature:  v.naturezaOperacao             ?? this.tax.operationNature,
      totalRetentions:  this.computeTotal(),
      manualAliquots:   !!v.definirAliquotasManual,
      irfAliquot:       parseDecimalBR(v.aliqIRRF),
      irfCode:          v.irfCode                      ?? '',
      pisAliquot:       parseDecimalBR(v.aliqPIS),
      pisCode:          v.pisCode                      ?? '',
      pccAliquot:       parseDecimalBR(v.aliqPCC),
      pccCode:          v.pccCode                      ?? '',
      cofinsAliquot:    parseDecimalBR(v.aliqCOFINS),
      cofinsCode:       v.cofinsCode                   ?? '',
      inssAliquot:      parseDecimalBR(v.aliqINSS),
      inssCode:         v.inssCode                     ?? '',
      csllAliquot:      parseDecimalBR(v.aliqCSLL),
      csllCode:         v.csllCode                     ?? '',
      issAliquot:       parseDecimalBR(v.aliqISS),
      issCode:          v.issCode                      ?? '',
      ibsAliquot:       parseDecimalBR(v.aliqIBS),
      ibsCode:          v.ibsCode                      ?? '',
      cbsAliquot:       parseDecimalBR(v.aliqCBS),
      cbsCode:          v.cbsCode                      ?? '',
      status:           this.tax.status ?? 'Active',
      services,
    };

    this.save.emit(payload);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      fornecedor:             ['', Validators.required],
      codigoServico:          ['', Validators.required],
      tituloServico:          ['', Validators.required],
      naturezaOperacao:       [''],
      descricao:              [''],
      definirAliquotasManual: [false],
      resumoRetencoes:        [{ value: '', disabled: true }],
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
  }

  private emptyService(): Partial<TaxService> {
    return {
      name: '', description: '', externalCode: '',
      grantorOrgan: '', hasRetention: false,
      accessorOrgan: '', concessionLink: '',
      costCenterId: null, projectId: null, activityId: null,
    };
  }

  private ensureNatureOption(nature?: string | null): void {
    const n = (nature ?? '').trim();
    if (n && !this.operationNatures().includes(n)) {
      this.operationNatures.update(list => [...list, n].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    }
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
}
