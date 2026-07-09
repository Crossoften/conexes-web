// src/app/features/contract-transfers/new/contract-transfer-new.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ContractTransfersService } from '../contract-transfers.service';
import {
  PartnershipPayload,
  PartnershipRef,
  PartnershipDetail,
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
  private route  = inject(ActivatedRoute);
  private svc    = inject(ContractTransfersService);
  private notify = inject(NotificationService);

  activeTab: ContractTab = 'DADOS';

  readonly loading       = signal(false);
  readonly grantors      = signal<PartnershipRef[]>([]);
  readonly entities      = signal<PartnershipRef[]>([]);
  readonly partnershipId = signal<number | null>(null);

  readonly viewMode = signal(false);

  readonly statusOptions: { label: string; value: PartnershipStatus }[] = [
    { label: 'Ativo',    value: 'Active'   },
    { label: 'Pendente', value: 'Pending'  },
    { label: 'Inativo',  value: 'Inactive' },
  ];

  readonly contractingTypeOptions = [
    'Acordo de Cooperação',
    'Auxílio',
    'Contrato de Gestão',
    'Contribuição',
    'Termo de Convênio',
    'Subvenção',
    'Termo de Colaboração',
    'Termo de Fomento',
    'Termo de Parceria',
  ];

  readonly sourceOptions = [
    'Indefinido',
    'Recursos Do Tesouro',
    'Transferências E Convênios Estaduais - Vinculados',
    'Recursos Próprios De Fundos Especiais De Despesa - Vinculados',
    'Recursos Próprios Da Administração Indireta',
    'Transferências E Convênios Federais - Vinculados',
    'Outras Fontes De Recursos',
    'Operações De Crédito',
  ];

  readonly validationOptions = [
    'Sem Validação',
    'Validar Plano de Aplicação',
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

    validationType:       ['', Validators.required],

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

    this.viewMode.set(!!this.route.snapshot.data['view']);

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.partnershipId.set(id);
      this.svc.getById(id).subscribe({
        next: detail => {
          this.hydrate(detail);
          if (this.viewMode()) this.form.disable();
        },
        error: () => this.notify.error('Erro ao carregar a parceria.'),
      });
    }
  }

  // ── Edição: hidratar o form ───────────────────────────────────────────────────

  private dstr(s: string | null | undefined): string { return s ? String(s).slice(0, 10) : ''; }
  private nstr(n: number | null | undefined): string { return n != null ? String(n) : ''; }

  private hydrate(d: PartnershipDetail): void {
    const resp = d.responsibles ?? [];
    const anx  = d.annexes ?? [];

    this.form.patchValue({
      title:                 d.title ?? '',
      concessor:             d.grantorId != null ? String(d.grantorId) : '',
      entidade:              d.entityId != null ? String(d.entityId) : '',
      tipoContratualizacao:  d.contractingType ?? '',
      validationType:        d.validationType ?? '',
      gestorParceria:        d.manager ?? '',
      dataInicio:            this.dstr(d.startDate),
      dataTermino:           this.dstr(d.endDate),
      dataAssinatura:        this.dstr(d.signatureDate),
      nroProcessoAdmin:      d.adminProcessNumber ?? '',
      nroTermo:              d.termNumber ?? '',
      nroDispensa:           d.dispensationNumber ?? '',
      dataImpressaoAnexo1:   this.dstr(anx[0]?.printDate),
      dataLimite1:           this.dstr(anx[0]?.deadlineDate),
      tipoValidacao1:        anx[0]?.validationType ?? '',
      dataImpressaoAnexo2:   this.dstr(anx[1]?.printDate),
      dataLimite2:           this.dstr(anx[1]?.deadlineDate),
      tipoValidacao2:        anx[1]?.validationType ?? '',
      valorRecursoMunicipal: this.nstr(d.municipalValue),
      valorRecursoEstadual:  this.nstr(d.stateValue),
      valorRecursoFederal:   this.nstr(d.federalValue),
      fonteRecursoMunicipal: d.municipalSource ?? '',
      fonteRecursoEstadual:  d.stateSource ?? '',
      fonteRecursoFederal:   d.federalSource ?? '',
      contaRecursoMunicipal: d.municipalAccount ?? '',
      contaRecursoEstadual:  d.stateAccount ?? '',
      contaRecursoFederal:   d.federalAccount ?? '',
      valorTotal:            this.nstr(d.totalValue),
      objeto:                d.object ?? '',
      ocultarPortal:         d.hideTransparency ? 'Sim' : 'Nao',
      qtdeDiasPrestacao:     this.nstr(d.accountRenderingQty),
      qtdeDiasAnalise:       this.nstr(d.analysisDaysQty),
      comissaoMonitoramento: d.monitoringCommission ?? '',
      leiAutorizadora:       d.authorizedLaw ?? '',
      status:                d.status ?? 'Active',
      responsaveis:          resp.find(r => r.type === 'Responsável')?.name ?? '',
      responsaveisFisc:      resp.find(r => r.type === 'Fiscalização')?.name ?? '',
      secretaria:            d.department ?? '',
      emendaParlamentar:     d.parliamentaryExemplar ?? '',
    });

    if (d.payables?.length) {
      this.payables.clear();
      d.payables.forEach((p, i) => {
        const fg = this.newPayable(p.installment ?? i + 1);
        fg.patchValue({ dueDate: this.dstr(p.dueDate), value: this.nstr(p.value) });
        this.payables.push(fg);
      });
    }
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
      validationType:        v.validationType      || undefined,
      contractingType:       v.tipoContratualizacao || undefined,
      department:            v.secretaria          || undefined,
      grantorId:             Number(v.concessor),
      entityId:              Number(v.entidade),
      responsibles,
      payables,
      annexes:               annexes.length ? annexes : undefined,
    };

    const id = this.partnershipId();
    const request = id ? this.svc.update(id, payload) : this.svc.create(payload);

    this.loading.set(true);
    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success(id ? 'Parceria atualizada com sucesso.' : 'Parceria cadastrada com sucesso.');
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
