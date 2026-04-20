// src/app/features/bank-accounts/new/bank-account-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

type BankAccountTab = 'PARAMS' | 'BOLETO';

@Component({
  selector: 'app-bank-account-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './bank-account-new.page.html',
  styleUrl: './bank-account-new.page.scss',
})
export class BankAccountNewPage {
  form: FormGroup;
  activeTab: BankAccountTab = 'PARAMS';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Dados Gerais
      banco: ['', Validators.required],
      fontePagadora: ['', Validators.required],
      tipoConta: ['', Validators.required],
      dataAbertura: ['', Validators.required],
      
      apelidoConta: ['', Validators.required],
      agenciaDigito: ['', Validators.required],
      numeroContaDigito: ['', Validators.required],
      saldoInicial: ['', Validators.required],
      
      telefonePrincipal: ['', Validators.required],
      telefoneCelular: ['', Validators.required],
      emailContato: ['', [Validators.required, Validators.email]],
      
      contaContabil1: [''],
      contato: [''],
      telefoneContato: [''],
      celularContato: [''],
      
      tipoRecurso: [''],
      contaContabil2: [''], // Repetido conforme mockup
      
      dadosDiferentes: [false],

      // Aba: Configurações de parâmetros
      numeroConvenioPagamento: [''],
      cnpjConta: [''],
      intervaloPagamentoCnab1: [''],
      hashApiPagamentos: [''],
      codigoMovimento: [''],
      intervaloPagamentoCnab2: [''],

      // Aba: Dados para emissão de boleto (mocked as disabled)
      sequencialNossoNumero: [{ value: 'Preenchido', disabled: true }],
      codigoBeneficiario: [{ value: 'Preenchido', disabled: true }],
      carteira: [{ value: 'Preenchido', disabled: true }],
      numeroConvenioCobranca: [{ value: 'Preenchido', disabled: true }],
      variacaoCarteira: [{ value: 'Preenchido', disabled: true }],
      modalidade: [{ value: 'Preenchido', disabled: true }],
    });
  }

  setTab(tab: BankAccountTab) {
    this.activeTab = tab;
  }

  resetForm() {
    this.form.reset({
      dadosDiferentes: false,
      sequencialNossoNumero: 'Preenchido',
      codigoBeneficiario: 'Preenchido',
      carteira: 'Preenchido',
      numeroConvenioCobranca: 'Preenchido',
      variacaoCarteira: 'Preenchido',
      modalidade: 'Preenchido'
    });
    this.activeTab = 'PARAMS';
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