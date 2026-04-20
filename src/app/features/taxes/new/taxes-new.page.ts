// src/app/features/taxes/new/taxes-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

type TaxTab = 'CONFIG' | 'ALIQUOTAS' | 'SERVICOS';

@Component({
  selector: 'app-taxes-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './taxes-new.page.html',
  styleUrl: './taxes-new.page.scss',
})
export class TaxesNewPage {
  form: FormGroup;
  activeTab: TaxTab = 'CONFIG';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Dados do Serviço (Fixo no topo)
      fornecedor: ['', Validators.required],
      codigoServico: ['', Validators.required],
      tituloServico: ['', Validators.required],

      // Aba: Configuração
      naturezaOperacao: [''],
      definirAlíquotasManual: [false],
      resumoRetencoes: [{ value: 'Valor preenchido', disabled: true }],

      // Aba: Alíquotas
      aliqIRRF: [''], codIRRF: [''],
      aliqPCC: [''], codPCC: [''],
      aliqINSS: [''], codINSS: [''],
      aliqISS: [''], codISS: [''],
      aliqCBS: [''], codCBS: [''],
      aliqPIS: [''], codPIS: [''],
      aliqCOFINS: [''], codCOFINS: [''],
      aliqCSLL: [''], codCSLL: [''],
      aliqIBS: [''], codIBS: [''],

      // Aba: Serviços
      servNome: ['', Validators.required],
      servDescricao: ['', Validators.required],
      servCodExterno: ['', Validators.required],
      servOrgao: ['', Validators.required],
      servRedencao: [''],
      servVinculo: [''],
    });
  }

  setTab(tab: TaxTab) {
    this.activeTab = tab;
  }

  resetForm() {
    this.form.reset({
      fornecedor: '', codigoServico: '',
      definirAlíquotasManual: false,
      resumoRetencoes: 'Valor preenchido'
    });
    this.activeTab = 'CONFIG';
  }

  onNextOrSubmit() {
    if (this.activeTab === 'CONFIG') {
      this.activeTab = 'ALIQUOTAS';
    } else if (this.activeTab === 'ALIQUOTAS') {
      this.activeTab = 'SERVICOS';
    } else {
      // Submissão real no último passo
      if (this.form.valid) {
        console.log('Form data:', this.form.getRawValue());
        // Lógica de salvamento aqui
      } else {
        this.form.markAllAsTouched();
      }
    }
  }
}