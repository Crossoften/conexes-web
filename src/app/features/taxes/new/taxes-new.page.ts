// src/app/features/taxes/new/taxes-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { TaxesService } from '../taxes.service';
import { TaxPayload, TaxService } from '../taxes.model';

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

  activeTab: TaxTab = 'CONFIG';

  // Services gerenciados como array dinâmico
  services: TaxService[] = [];
  newService: Partial<TaxService> = this.emptyService();

  private emptyService(): Partial<TaxService> {
    return {
      name: '', description: '', externalCode: '',
      grantorOrgan: '', hasRetention: false,
      accessorOrgan: '', concessionLink: '',
      costCenterId: 0, projectId: 0,
    };
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
    aliqINSS:   [''],
    aliqCSLL:   [''],
    aliqIBS:    [''],
    aliqCBS:    [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
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
      totalRetentions: 0,
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
      csllAliquot:     Number(v.aliqCSLL)              || 0,
      ibsAliquot:      Number(v.aliqIBS)               || 0,
      cbsAliquot:      Number(v.aliqCBS)               || 0,
      services:        this.services,
    };

    this.svc.create(payload).subscribe({
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
