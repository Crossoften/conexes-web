// src/app/features/contract-transfers/new/contract-transfer-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

type ContractTab = 'DADOS' | 'CONTAS' | 'ANEXOS';

@Component({
  selector: 'app-contract-transfer-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './contract-transfer-new.page.html',
  styleUrl: './contract-transfer-new.page.scss',
})
export class ContractTransferNewPage {
  form: FormGroup;
  activeTab: ContractTab = 'DADOS';

  // Mock de anexos para a aba 3
  anexos = [
    { id: 1, nome: 'Anexo 1' },
    { id: 2, nome: 'Anexo 2' }
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // -- Aba 1: Dados Gerais --
      concessor: ['', Validators.required],
      entidade: ['', Validators.required],
      
      tipoContratualizacao: ['', Validators.required],
      gestorParceria: ['', Validators.required],
      dataInicio: [''],
      dataTermino: [''],

      dataAssinatura: [''],
      nroProcessoAdmin: [''],
      nroTermo: [''],
      nroDispensa: [''],

      dataImpressaoAnexo1: [''], dataLimite1: [''], tipoValidacao1: [''],
      dataImpressaoAnexo2: [''], dataLimite2: [''], tipoValidacao2: [''],

      valorRecursoMunicipal: [''], valorRecursoEstadual: [''], valorRecursoFederal: [''],
      fonteRecursoMunicipal: [''], fonteRecursoEstadual: [''], fonteRecursoFederal: [''],
      contaRecursoMunicipal: [''], contaRecursoEstadual: [''], contaRecursoFederal: [''],

      valorTotal: [''],
      objeto: [''],

      ocultarPortal: [''],
      qtdeDiasPrestacao: [''],
      qtdeDiasAnalise: [''],

      comissaoMonitoramento: [''],
      leiAutorizadora: [''],
      status: [''],

      responsaveis: [''],
      responsaveisFisc: [''],
      secretaria: [''],
      emendaParlamentar: [''],

      // -- Aba 2: Inclusão contas a pagar --
      parcelar: ['Sim', Validators.required],
      parcelas: ['', Validators.required],
      definirValorVencimento: [false],
      
      // Campos desabilitados por padrão (como no mockup)
      parcelaDetalhe: [{ value: 'Exemplo', disabled: true }],
      vencimentoDetalhe: [{ value: 'Exemplo', disabled: true }],
      valorDetalhe: [{ value: 'Exemplo', disabled: true }]
    });
  }

  setTab(tab: ContractTab) {
    this.activeTab = tab;
  }

  resetForm() {
    this.form.reset({
      parcelar: 'Sim',
      definirValorVencimento: false,
      parcelaDetalhe: 'Exemplo',
      vencimentoDetalhe: 'Exemplo',
      valorDetalhe: 'Exemplo'
    });
    this.activeTab = 'DADOS';
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