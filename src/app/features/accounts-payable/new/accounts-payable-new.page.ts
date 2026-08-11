// src/app/features/accounts-payable/new/accounts-payable-new.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AccountsPayableService } from '../accounts-payable.service';
import { PurchasesService } from '../../purchases/purchases.service';
import { NotificationService } from '../../../shared/services/notification.service';

type MainTab = 'GERAIS' | 'RATEIO' | 'IMPOSTOS' | 'ANEXOS';
type SubTab = 'COMPETENCIA' | 'CLASSIFICACAO';
interface Ref { id: number; name: string; }

@Component({
  selector: 'app-accounts-payable-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './accounts-payable-new.page.html',
  styleUrl: './accounts-payable-new.page.scss',
})
export class AccountsPayableNewPage implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(AccountsPayableService);
  private lookups = inject(PurchasesService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  form: FormGroup;

  activeMainTab: MainTab = 'GERAIS';
  activeSubTab: SubTab = 'COMPETENCIA';
  isParcelamentoOpen = true;
  saving = signal(false);

  // Lookups reais para os selects
  readonly suppliers    = signal<Ref[]>([]);
  readonly accountPlans = signal<Ref[]>([]);
  readonly costCenters  = signal<Ref[]>([]);

  anexos = [
    { id: 1, nome: 'Nota fiscal' },
    { id: 2, nome: 'Anexo 2' },
    { id: 3, nome: 'Anexo 3' }
  ];

  constructor() {
    this.form = this.fb.group({
      // -- Dados gerais (obrigatórios de verdade, conforme o contrato do back) --
      fornecedor: ['', Validators.required],
      historicoDespesa: ['', Validators.required],
      tipoDespesa: [''],
      dataEmissao1: ['', Validators.required],   // → issueDate
      dataEmissao2: ['', Validators.required],   // → dueDate
      valorBruto: ['', Validators.required],      // → grossAmount
      valorLiquido: ['', Validators.required],    // → netAmount
      dataCadastro: [''],                          // → competencyDate (opcional)

      // -- Competência e dados de contrato (opcionais) --
      competencia: [''],
      codCompras: [''],
      contrato: [''],
      valorContrato: [{ value: '', disabled: true }],
      saldoContrato: [{ value: '', disabled: true }],
      dataInicioContrato: [{ value: '', disabled: true }],
      dataFimContrato: [{ value: '', disabled: true }],

      // -- Rateio e parcelamento (opcionais) --
      categoria: [''],
      projetoCentroCusto: [''],
      subprojeto: [''],
      rateio: [''],
      valorRateio: [''],

      parcelar: ['Nao'],
      parcelas: [''],
      definirValorVencimento: [false],
      parcelaDetalhe: [{ value: '', disabled: true }],
      vencimentoDetalhe: [{ value: '', disabled: true }],
      valorDetalhe: [{ value: '', disabled: true }],

      // -- Impostos retidos (opcionais) --
      aliqIRRF: [''], codIRRF: [''],
      aliqPIS: [''], codPIS: [''],
      aliqPCC: [''], codPCC: [''],
      aliqCOFINS: [''], codCOFINS: [''],
      aliqINSS: [''], codINSS: [''],
      aliqCSLL: [''], codCSLL: [''],
      aliqISS: [''], codISS: [''],

      observacoes: ['']
    });
  }

  ngOnInit(): void {
    this.lookups.getSuppliersLookup().subscribe({ next: v => this.suppliers.set(v as Ref[]), error: () => {} });
    this.lookups.getAccountPlansLookup().subscribe({ next: v => this.accountPlans.set(v as Ref[]), error: () => {} });
    this.lookups.getCostCentersLookup().subscribe({ next: v => this.costCenters.set(v as Ref[]), error: () => {} });
  }

  setMainTab(tab: MainTab) { this.activeMainTab = tab; }
  setSubTab(tab: SubTab) { this.activeSubTab = tab; }
  toggleParcelamento() { this.isParcelamentoOpen = !this.isParcelamentoOpen; }

  resetForm() {
    this.form.reset({ parcelar: 'Nao', definirValorVencimento: false });
    this.activeMainTab = 'GERAIS';
    this.activeSubTab = 'COMPETENCIA';
  }

  private buildPayload() {
    const v = this.form.getRawValue();
    const num = (x: any) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
    const payload: any = {
      stakeholderId: Number(v.fornecedor),
      issueDate: v.dataEmissao1,
      dueDate: v.dataEmissao2,
      grossAmount: num(v.valorBruto),
      netAmount: num(v.valorLiquido),
      history: v.historicoDespesa,
      description: v.historicoDespesa,
    };
    if (v.tipoDespesa) payload.expenseType = v.tipoDespesa;
    if (v.dataCadastro) payload.competencyDate = v.dataCadastro;
    if (v.observacoes) payload.observation = v.observacoes;

    // Rateio (opcional): só envia se houver categoria ou centro de custo escolhidos
    if (v.categoria || v.projetoCentroCusto) {
      payload.rateios = [{
        accountPlanId: v.categoria ? Number(v.categoria) : undefined,
        costCenterId: v.projetoCentroCusto ? Number(v.projetoCentroCusto) : undefined,
        percentage: v.rateio ? num(v.rateio) : 100,
        amount: v.valorRateio ? num(v.valorRateio) : num(v.valorLiquido),
      }];
    }
    return payload;
  }

  onSubmit() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios (fornecedor, histórico, datas e valores).');
      // Se o campo pendente estiver em outra aba, volta para Dados gerais.
      this.activeMainTab = 'GERAIS';
      return;
    }
    this.saving.set(true);
    this.svc.create(this.buildPayload()).subscribe({
      next: () => {
        this.notify.success('Conta a pagar cadastrada com sucesso.');
        this.router.navigate(['/accounts-payable']);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message;
        this.notify.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao cadastrar a conta a pagar.'));
      },
    });
  }
}