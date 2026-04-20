// src/app/features/quotations/new/quotation-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { NgClass } from '@angular/common';

type QuotationTab = 'DADOS' | 'FONTE' | 'ITENS' | 'LOCAL' | 'ANEXOS';

@Component({
  selector: 'app-quotation-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './quotation-new.page.html',
  styleUrl: './quotation-new.page.scss',
})
export class QuotationNewPage {
  form: FormGroup;
  activeTab: QuotationTab = 'DADOS';

  // Array simulado para renderizar os cards de item na aba 3
  itemsList = [1]; 

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Aba 1: Dados da requisição
      requisitante: ['', Validators.required],
      emailRetorno: [''],
      areaRequisitante: [''],
      
      numeroReferencia: [{ value: 'Automático', disabled: true }],
      tituloRequisicao: ['', Validators.required],
      tipoPedido: ['', Validators.required],
      dataRequisicao: ['', Validators.required],
      dataEntregaPrevista: [''],
      valorGlobalEstimado: [''],

      descricaoPedido: ['', Validators.required],
      justificativaCompra: ['', Validators.required],
      obrigacoesContratada: [''],
      condicoesComerciais: [''],

      // Aba 2: Fonte, Fornecedor e Contrato
      fontePagadora: ['', Validators.required],
      projetoCentroCusto: ['', Validators.required],
      categoriaConta: ['', Validators.required],
      subprojeto: [''],
      atividade: [''],
      
      fornecedorUnico: [false],
      qtdFornecedores: ['00000'],
      
      pesquisarContrato: [''],
      requisicaoContratoExiste: [''],

      // Aba 4: Local de entrega
      localEntrega: ['', Validators.required],
      responsavelEntrega: ['', Validators.required],
      cepEntrega: ['', Validators.required],
      enderecoEntrega: ['', Validators.required],
      numeroEntrega: ['', Validators.required],
    });
  }

  setTab(tab: QuotationTab) {
    this.activeTab = tab;
  }

  addItem() {
    this.itemsList.push(this.itemsList.length + 1);
  }

  removeItem(index: number) {
    this.itemsList.splice(index, 1);
  }

  resetForm() {
    this.form.reset({
      numeroReferencia: 'Automático',
      fornecedorUnico: false,
      qtdFornecedores: '00000'
    });
    this.itemsList = [1];
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