// src/app/features/contract-transfers/new/contract-transfer-new.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ContractTransfersService } from '../contract-transfers.service';
import {
  PartnershipPayload,
  PartnershipRef,
  PartnershipResponsiblePayload,
  PartnershipAnnexPayload,
  PartnershipStatus,
} from '../contract-transfers.model';
import { NotificationService } from '../../../shared/services/notification.service';

type ContractTab = 'DADOS' | 'CONTAS' | 'ANEXOS';

/** Converte string monetária/numérica (pt-BR) em number; vazio → undefined. */
function toNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

@Component({
  selector: 'app-contract-transfer-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './contract-transfer-new.page.html',
  styleUrl: './contract-transfer-new.page.scss',
})
export class ContractTransferNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(ContractTransfersService);
  private notify = inject(NotificationService);

  activeTab: ContractTab = 'DADOS';

  readonly loading  = signal(false);
  readonly grantors = signal<PartnershipRef[]>([]);
  readonly entities = signal<PartnershipRef[]>([]);

  readonly statusOptions: { label: string; value: PartnershipStatus }[] = [
    { label: 'Ativo',    value: 'Active'   },
    { label: 'Pendente', value: 'Pending'  },
    { label: 'Inativo',  value: 'Inactive' },
  ];

  form: FormGroup = this.fb.group({
    // -- Aba 1: Dados Gerais --
    title:                ['', Validators.required],
    concessor:            ['', Validators.required], // grantorId
    entidade:             ['', Validators.required], // entityId

    tipoContratualizacao: [''],
    gestorParceria:       [''],
    dataInicio:           [''],
    dataTermino:          [''],

    dataAssinatura:       [''],
    nroProcessoAdmin:     [''],
    nroTermo:             [''],
    nroDispensa:          [''],

    dataImpressaoAnexo1:  [''], dataLimite1: [''], tipoValidacao1: [''],
    dataImpressaoAnexo2:  [''], dataLimite2: [''], tipoValidacao2: [''],

    valorRecursoMunicipal: [''], valorRecursoEstadual: [''], valorRecursoFederal: [''],
    fonteRecursoMunicipal: [''], fonteRecursoEstadual: [''], fonteRecursoFederal: [''],
    contaRecursoMunicipal: [''], contaRecursoEstadual: [''], contaRecursoFederal: [''],

    valorTotal:           [''],
    objeto:               [''],

    ocultarPortal:        ['Nao'],
    qtdeDiasPrestacao:    [''],
    qtdeDiasAnalise:      [''],

    comissaoMonitoramento: [''],
    leiAutorizadora:       [''],
    status:                ['Active' as PartnershipStatus],

    responsaveis:         [''],
    responsaveisFisc:     [''],
    secretaria:           [''],
    emendaParlamentar:    [''],

    // -- Aba 2: Inclusão contas a pagar (parcelas) --
    parcelar:             ['Sim'],
    payables:             this.fb.array([this.newPayable(1)]),
  });

  ngOnInit(): void {
    this.svc.getGrantorsLookup().subscribe({
      next: rows => this.grantors.set(rows),
      error: () => this.notify.error('Erro ao carregar órgãos concessores.'),
    });
    this.svc.getEntitiesLookup().subscribe({
      next: rows => this.entities.set(rows),
      error: () => this.notify.error('Erro ao carregar entidades.'),
    });
  }

  // ── Parcelas (payables) ─────────────────────────────────────────────────────

  get payables(): FormArray {
    return this.form.get('payables') as FormArray;
  }

  private newPayable(installment: number): FormGroup {
    return this.fb.group({
      installment: [installment],
      dueDate:     [''],
      value:       [''],
    });
  }

  addPayable(): void {
    this.payables.push(this.newPayable(this.payables.length + 1));
  }

  removePayable(index: number): void {
    this.payables.removeAt(index);
    // Renumera as parcelas restantes.
    this.payables.controls.forEach((ctrl, i) => ctrl.get('installment')?.setValue(i + 1));
  }

  refLabel(ref: PartnershipRef): string {
    return ref.legalName ?? ref.tradeName ?? ref.name ?? String(ref.id);
  }

  setTab(tab: ContractTab): void {
    this.activeTab = tab;
  }

  resetForm(): void {
    this.form.reset({ ocultarPortal: 'Nao', status: 'Active', parcelar: 'Sim' });
    this.payables.clear();
    this.payables.push(this.newPayable(1));
    this.activeTab = 'DADOS';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios (Título, Concessor e Entidade).');
      return;
    }

    const v = this.form.getRawValue();

    const responsibles: PartnershipResponsiblePayload[] = [];
    if (v.responsaveis)     responsibles.push({ type: 'Responsável',  name: v.responsaveis });
    if (v.responsaveisFisc) responsibles.push({ type: 'Fiscalização', name: v.responsaveisFisc });

    const annexes: PartnershipAnnexPayload[] = [];
    const a1 = { printDate: v.dataImpressaoAnexo1 || undefined, deadlineDate: v.dataLimite1 || undefined, validationType: v.tipoValidacao1 || undefined };
    const a2 = { printDate: v.dataImpressaoAnexo2 || undefined, deadlineDate: v.dataLimite2 || undefined, validationType: v.tipoValidacao2 || undefined };
    if (a1.printDate || a1.deadlineDate || a1.validationType) annexes.push(a1);
    if (a2.printDate || a2.deadlineDate || a2.validationType) annexes.push(a2);

    const payables = (v.payables as { installment: number; dueDate: string; value: string }[])
      .filter(p => p.dueDate || p.value)
      .map((p, i) => ({
        installment: Number(p.installment) || i + 1,
        dueDate:     p.dueDate,
        value:       toNumber(p.value) ?? 0,
      }));

    const payload: PartnershipPayload = {
      title:                 v.title,
      manager:               v.gestorParceria      || undefined,
      startDate:             v.dataInicio          || undefined,
      endDate:               v.dataTermino         || undefined,
      signatureDate:         v.dataAssinatura      || undefined,
      adminProcessNumber:    v.nroProcessoAdmin    || undefined,
      termNumber:            v.nroTermo            || undefined,
      dispensationNumber:    v.nroDispensa         || undefined,
      municipalValue:        toNumber(v.valorRecursoMunicipal),
      stateValue:            toNumber(v.valorRecursoEstadual),
      federalValue:          toNumber(v.valorRecursoFederal),
      municipalSource:       v.fonteRecursoMunicipal || undefined,
      stateSource:           v.fonteRecursoEstadual  || undefined,
      federalSource:         v.fonteRecursoFederal   || undefined,
      municipalAccount:      v.contaRecursoMunicipal || undefined,
      stateAccount:          v.contaRecursoEstadual  || undefined,
      federalAccount:        v.contaRecursoFederal   || undefined,
      totalValue:            toNumber(v.valorTotal),
      object:                v.objeto              || undefined,
      hideTransparency:      v.ocultarPortal === 'Sim',
      accountRenderingQty:   toNumber(v.qtdeDiasPrestacao),
      analysisDaysQty:       toNumber(v.qtdeDiasAnalise),
      monitoringCommission:  v.comissaoMonitoramento || undefined,
      authorizedLaw:         v.leiAutorizadora     || undefined,
      parliamentaryExemplar: v.emendaParlamentar   || undefined,
      status:                v.status as PartnershipStatus,
      contractingType:       v.tipoContratualizacao || undefined,
      department:            v.secretaria          || undefined,
      grantorId:             Number(v.concessor),
      entityId:              Number(v.entidade),
      responsibles,
      payables,
      annexes:               annexes.length ? annexes : undefined,
    };

    this.loading.set(true);
    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Parceria cadastrada com sucesso.');
        this.router.navigate(['/contract-transfers']);
      },
      error: err => {
        this.loading.set(false);
        const raw = err?.error?.message ?? 'Erro ao salvar parceria. Tente novamente.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }
}
