// src/app/features/budgets/new/budget-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-budget-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './budget-new.page.html',
  styleUrl: './budget-new.page.scss',
})
export class BudgetNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Informações básicas
      titulo: ['', Validators.required],
      periodicidade: ['', Validators.required],
      tipoLancamento: ['', Validators.required],
      descricao: [''],

      // Período
      mesInicio: ['', Validators.required],
      anoInicio: ['', Validators.required],
      mesFim: ['', Validators.required],
      anoFim: ['', Validators.required],

      // Projeto/Centro de custo
      projetoCentroCusto: [''],
      subprojeto: [''],
      atividade: [''],

      // Formas de acompanhamento
      acompCategoria: [false],
      acompProjeto: [false],
      acompSubprojeto: [false],
      acompAtividade: [false],

      // Restringir movimentações
      restringirMovimentacoes: [false],

      // Ocultar orçamento
      usuarios: [''],
      gruposPermissoes: ['']
    });
  }

  resetForm() {
    this.form.reset({
      acompCategoria: false,
      acompProjeto: false,
      acompSubprojeto: false,
      acompAtividade: false,
      restringirMovimentacoes: false
    });
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.value);
      // Lógica de salvamento
    } else {
      this.form.markAllAsTouched();
    }
  }
}