// src/app/features/positions/new/positions-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-positions-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './positions-new.page.html',
  styleUrl: './positions-new.page.scss',
})
export class PositionsNewPage {
  form: FormGroup;
  isIntegrantesOpen = true; // Controla o accordion da seção Integrantes

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Dados Gerais
      entidadeSelect: ['', Validators.required],
      tipo: ['', Validators.required],
      finalidade: ['', Validators.required],
      
      descricao: ['', Validators.required],
      dataEleicao: ['', Validators.required],
      codigoAudesp: [''],
      
      entidadeInput: ['', Validators.required],
      celular: [''],

      // Integrantes
      colaborador: ['', Validators.required],
      dataInicio: ['', Validators.required],
      dataTermino: ['']
    });
  }

  toggleIntegrantes() {
    this.isIntegrantesOpen = !this.isIntegrantesOpen;
  }

  resetForm() {
    this.form.reset();
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