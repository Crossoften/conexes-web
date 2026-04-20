// src/app/features/accounts-payable/new/accounts-payable-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

type MainTab = 'GERAIS' | 'RATEIO' | 'IMPOSTOS' | 'ANEXOS';
type SubTab = 'COMPETENCIA' | 'CLASSIFICACAO';

@Component({
  selector: 'app-accounts-payable-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './accounts-payable-new.page.html',
  styleUrl: './accounts-payable-new.page.scss',
})
export class AccountsPayableNewPage {
  form: FormGroup;
  
  activeMainTab: MainTab = 'GERAIS';
  activeSubTab: SubTab = 'COMPETENCIA';
  
  isParcelamentoOpen = true;

  anexos = [
    { id: 1, nome: 'Nota fiscal' },
    { id: 2, nome: 'Anexo 2' },
    { id: 3, nome: 'Anexo 3' }
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // -- Aba 1: Dados gerais (Top) --
      fornecedor: ['', Validators.required],
      historicoDespesa: ['', Validators.required],
      tipoDespesa: ['', Validators.required],
      dataEmissao1: ['', Validators.required],
      dataEmissao2: ['', Validators.required],
      valorBruto: ['', Validators.required],
      valorLiquido: ['', Validators.required],
      dataCadastro: ['', Validators.required],

      // -- Aba 1: Competência e dados de contrato --
      competencia: ['', Validators.required],
      codCompras: ['', Validators.required],
      contrato: [''],
      valorContrato: [{ value: 'Exemplo', disabled: true }],
      saldoContrato: [{ value: 'Exemplo', disabled: true }],
      dataInicioContrato: [{ value: 'Exemplo', disabled: true }],
      dataFimContrato: [{ value: 'Exemplo', disabled: true }],

      // -- Aba 2: Rateio e parcelamento --
      categoria: ['', Validators.required],
      projetoCentroCusto: ['', Validators.required],
      subprojeto: ['', Validators.required],
      rateio: ['', Validators.required],
      valorRateio: ['', Validators.required],
      
      parcelar: ['Sim', Validators.required],
      parcelas: ['', Validators.required],
      definirValorVencimento: [false],
      parcelaDetalhe: [{ value: 'Exemplo', disabled: true }],
      vencimentoDetalhe: [{ value: 'Exemplo', disabled: true }],
      valorDetalhe: [{ value: 'Exemplo', disabled: true }],

      // -- Aba 3: Impostos retidos --
      aliqIRRF: [''], codIRRF: [''],
      aliqPIS: [''], codPIS: [''],
      aliqPCC: [''], codPCC: [''],
      aliqCOFINS: [''], codCOFINS: [''],
      aliqINSS: [''], codINSS: [''],
      aliqCSLL: [''], codCSLL: [''],
      aliqISS: [''], codISS: [''],
      
      // -- Global / Repetido --
      observacoes: ['']
    });
  }

  setMainTab(tab: MainTab) {
    this.activeMainTab = tab;
  }

  setSubTab(tab: SubTab) {
    this.activeSubTab = tab;
  }

  toggleParcelamento() {
    this.isParcelamentoOpen = !this.isParcelamentoOpen;
  }

  resetForm() {
    this.form.reset({
      parcelar: 'Sim',
      definirValorVencimento: false,
      valorContrato: 'Exemplo',
      saldoContrato: 'Exemplo',
      dataInicioContrato: 'Exemplo',
      dataFimContrato: 'Exemplo',
      parcelaDetalhe: 'Exemplo',
      vencimentoDetalhe: 'Exemplo',
      valorDetalhe: 'Exemplo'
    });
    this.activeMainTab = 'GERAIS';
    this.activeSubTab = 'COMPETENCIA';
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.getRawValue());
      // Lógica de salvamento
    } else {
      this.form.markAllAsTouched();
    }
  }
}