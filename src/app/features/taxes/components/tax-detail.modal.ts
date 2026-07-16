// src/app/features/taxes/components/tax-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Tax, TaxPayload, TaxService, StakeholderItem } from '../taxes.model';

type ModalTab = 'GERAIS' | 'ALIQUOTAS' | 'SERVICOS';

@Component({
  selector: 'app-tax-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, FormsModule, DecimalPipe],
  templateUrl: './tax-detail.modal.html',
  styleUrl: './tax-detail.modal.scss',
})
export class TaxDetailModalComponent implements OnChanges {
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

  form: FormGroup;

  // services dinâmicos no modo edição
  services: TaxService[] = [];
  newService: Partial<TaxService> = this.emptyService();

  // Campos de alíquota que compõem o Total das Retenções (soma simples).
  private readonly ALIQUOT_FIELDS = [
    'aliqIRRF', 'aliqPIS', 'aliqPCC', 'aliqCOFINS',
    'aliqINSS', 'aliqCSLL', 'aliqIBS', 'aliqCBS',
  ];

  computeTotal(): number {
    const v = this.form.getRawValue();
    return this.ALIQUOT_FIELDS.reduce((sum, k) => sum + (Number(v[k]) || 0), 0);
  }

  constructor(private fb: FormBuilder) {
    this.form = this.buildForm();
    // Atualiza o "Total das Retenções" ao alterar as alíquotas.
    this.form.valueChanges.subscribe(() => {
      this.form.get('resumoRetencoes')?.setValue(this.computeTotal(), { emitEvent: false });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tax'] && this.tax) {
      this.form.patchValue({
        fornecedor:             this.tax.stakeholderId,
        codigoServico:          this.tax.serviceClassCode,
        tituloServico:          this.tax.serviceTitle,
        naturezaOperacao:       this.tax.operationNature,
        definirAliquotasManual: this.tax.manualAliquots,
        resumoRetencoes:        this.tax.totalRetentions,
        aliqIRRF:               this.tax.irfAliquot,
        irfCode:                this.tax.irfCode,
        aliqPIS:                this.tax.pisAliquot,
        pisCode:                this.tax.pisCode,
        aliqPCC:                this.tax.pccAliquot,
        pccCode:                this.tax.pccCode,
        aliqCOFINS:             this.tax.cofinsAliquot,
        cofinsCode:             this.tax.cofinsCode,
        aliqINSS:               this.tax.inssAliquot,
        aliqCSLL:               this.tax.csllAliquot,
        aliqIBS:                this.tax.ibsAliquot,
        aliqCBS:                this.tax.cbsAliquot,
      });
      this.services = [...(this.tax.services ?? [])];
    }

    if (changes['mode']) {
      if (this.mode === 'view') {
        this.form.disable();
      } else {
        this.form.enable();
        this.form.get('resumoRetencoes')?.disable();
      }
    }
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

  setTab(tab: ModalTab): void { this.activeTab = tab; }

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

    const payload: TaxPayload = {
      stakeholderId:    Number(v.fornecedor)           || this.tax.stakeholderId,
      serviceClassCode: v.codigoServico                ?? this.tax.serviceClassCode,
      serviceTitle:     v.tituloServico                ?? this.tax.serviceTitle,
      operationNature:  v.naturezaOperacao             ?? this.tax.operationNature,
      totalRetentions:  this.computeTotal(),
      manualAliquots:   !!v.definirAliquotasManual,
      irfAliquot:       Number(v.aliqIRRF)             || 0,
      irfCode:          v.irfCode                      ?? '',
      pisAliquot:       Number(v.aliqPIS)              || 0,
      pisCode:          v.pisCode                      ?? '',
      pccAliquot:       Number(v.aliqPCC)              || 0,
      pccCode:          v.pccCode                      ?? '',
      cofinsAliquot:    Number(v.aliqCOFINS)           || 0,
      cofinsCode:       v.cofinsCode                   ?? '',
      inssAliquot:      Number(v.aliqINSS)             || 0,
      csllAliquot:      Number(v.aliqCSLL)             || 0,
      ibsAliquot:       Number(v.aliqIBS)              || 0,
      cbsAliquot:       Number(v.aliqCBS)              || 0,
      services:         this.services,
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
      definirAliquotasManual: [false],
      resumoRetencoes:        [{ value: '', disabled: true }],
      aliqIRRF:   [''], irfCode:    [''],
      aliqPIS:    [''], pisCode:    [''],
      aliqPCC:    [''], pccCode:    [''],
      aliqCOFINS: [''], cofinsCode: [''],
      aliqINSS:   [''],
      aliqCSLL:   [''],
      aliqIBS:    [''],
      aliqCBS:    [''],
    });
  }

  private emptyService(): Partial<TaxService> {
    return {
      name: '', description: '', externalCode: '',
      grantorOrgan: '', hasRetention: false,
      accessorOrgan: '', concessionLink: '',
      costCenterId: 0, projectId: 0,
    };
  }
}
