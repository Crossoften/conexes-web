// src/app/features/contract-transfers/new/contract-transfer-new.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, AbstractControl, Validators } from '@angular/forms';
import { ContractTransfersService } from '../contract-transfers.service';
import {
  PartnershipPayload,
  PartnershipPayablePayload,
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

  // Competência do repasse (mês). Valor enviado = nome em PT; trocar aqui caso o
  // back use enum em inglês (January…December).
  readonly monthOptions = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
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

    // -- Aba 2: Cronograma de Repasses --
    receiptType:          ['Unico'],   // Único | Recorrente (UI — não persiste no back)
    installmentsCount:    [''],        // nº de repasses (quando Recorrente)
    manualSchedule:       [false],     // "Definir valor e data manualmente"
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

  /** ISO (yyyy-mm-dd…) → dd/mm/aaaa para exibição nos campos mascarados. */
  private dbr(value: string | null | undefined): string {
    if (!value) return '';
    const m = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }

  /** Converte data para ISO 8601 (UTC). Tolerante a formatos: `dd/mm/aaaa`,
   *  `ddmmaaaa` (8 dígitos crus), ISO `yyyy-mm-dd…` e espaços em volta.
   *  Vazio / inválido → undefined. */
  private toIso(value: string | null | undefined): string | undefined {
    if (value == null) return undefined;
    const s = String(value).trim();
    if (!s) return undefined;

    let y: number, mo: number, d: number;

    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);        // já ISO (yyyy-mm-dd…)
    const br  = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);     // dd/mm/aaaa
    const raw = s.replace(/\D/g, '');                       // só dígitos

    if (iso) {
      y = +iso[1]; mo = +iso[2]; d = +iso[3];
    } else if (br) {
      d = +br[1]; mo = +br[2]; y = +br[3];
    } else if (raw.length === 8) {                          // ddmmaaaa
      d = +raw.slice(0, 2); mo = +raw.slice(2, 4); y = +raw.slice(4);
    } else {
      return undefined;
    }

    const date = new Date(Date.UTC(y, mo - 1, d));
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  /** Máscara dd/mm/aaaa aplicada ao control informado (linhas do cronograma).
   *  Escreve exclusivamente via `control.setValue` (que sincroniza o input) para
   *  garantir que o VALOR DO MODELO seja sempre o mascarado — evita a dessincronia
   *  (input mostra a data, mas o FormControl fica vazio) em linhas dinâmicas. */
  applyDateMask(event: Event, control: AbstractControl | null): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4)      masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (control) {
      control.setValue(masked);
    } else {
      input.value = masked;
    }
  }

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
        this.payables.push(this.newPayable(
          p.installment ?? i + 1,
          p.competency ?? '',
          this.dbr(p.dueDate),
          this.nstr(p.value),
        ));
      });
      // Reconstrói o "Tipo de recebimento" a partir da tabela salva (o back não
      // persiste essa config — front-first).
      const recurring = d.payables.length > 1;
      this.form.patchValue({
        receiptType:       recurring ? 'Recorrente' : 'Unico',
        installmentsCount: recurring ? String(d.payables.length) : '',
      });
    }
  }

  // ── Parcelas (payables) ─────────────────────────────────────────────────────

  get payables(): FormArray {
    return this.form.get('payables') as FormArray;
  }

  private newPayable(installment: number, competency = '', dueDate = '', value: string | number = ''): FormGroup {
    return this.fb.group({
      installment: [installment],
      competency:  [competency],
      dueDate:     [dueDate],
      value:       [value],
    });
  }

  addPayable(): void {
    this.payables.push(this.newPayable(this.payables.length + 1));
  }

  removePayable(index: number): void {
    this.payables.removeAt(index);
    // Renumera a sequência interna (installment) das linhas restantes.
    this.payables.controls.forEach((ctrl, i) => ctrl.get('installment')?.setValue(i + 1));
  }

  /** Gera o cronograma de repasses a partir do Tipo de recebimento.
   *  - Único: 1 linha com o valor total.
   *  - Recorrente: N linhas; se não for manual, distribui o valor total e
   *    pré-seleciona as competências (meses) em sequência. */
  generateSchedule(): void {
    const type   = this.form.get('receiptType')?.value;
    const total  = toNumber(this.form.get('valorTotal')?.value) ?? 0;

    this.payables.clear();

    if (type !== 'Recorrente') {
      this.payables.push(this.newPayable(1, '', '', total ? String(total) : ''));
      return;
    }

    const count  = Math.max(1, Number(this.form.get('installmentsCount')?.value) || 0);
    const manual = this.form.get('manualSchedule')?.value === true;
    const per    = manual || !total ? '' : String(this.round2(total / count));

    for (let i = 0; i < count; i++) {
      const competency = manual ? '' : this.monthOptions[i % 12];
      this.payables.push(this.newPayable(i + 1, competency, '', per));
    }
  }

  private round2(n: number): number { return Math.round(n * 100) / 100; }

  refLabel(ref: PartnershipRef): string {
    return ref.legalName ?? ref.tradeName ?? ref.name ?? String(ref.id);
  }

  setTab(tab: ContractTab): void {
    this.activeTab = tab;
  }

  resetForm(): void {
    this.form.reset({ ocultarPortal: 'Nao', status: 'Active', receiptType: 'Unico', manualSchedule: false });
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

    // Cronograma: o back exige dueDate obrigatório e em ISO 8601. Consideramos
    // "com conteúdo" as linhas que tenham mês, valor ou data; todas elas precisam
    // de uma data válida (dd/mm/aaaa) — senão bloqueamos com aviso claro.
    const scheduleRows = (v.payables as { competency: string; dueDate: string; value: string }[])
      .filter(p => p.competency || p.value || p.dueDate);

    if (scheduleRows.some(p => !this.toIso(p.dueDate))) {
      this.activeTab = 'CONTAS';
      this.notify.error('Preencha a data (dd/mm/aaaa) de todas as competências do cronograma de repasses.');
      return;
    }

    const payables: PartnershipPayablePayload[] = scheduleRows.map((p, i) => ({
      installment: i + 1,
      competency:  p.competency || undefined,
      dueDate:     this.toIso(p.dueDate)!,
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
