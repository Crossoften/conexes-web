// src/app/features/agencies/new/agency-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-agency-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './agency-new.page.html',
  styleUrl: './agency-new.page.scss',
})
export class AgencyNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      cnpj: ['', Validators.required],
      razaoSocial: ['', Validators.required],
      nomeFantasia: ['', Validators.required],
      emancipacao: [''],
      cep: ['', Validators.required],
      endereco: ['', Validators.required],
      nro: ['', Validators.required],
      complemento: [''],
      orgaoGestor: ['', Validators.required],
      telefoneCelular: [''],
      email: ['']
    });
  }

  onSaveDraft() {
    console.log('Rascunho salvo:', this.form.value);
    // Lógica para salvar rascunho
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.value);
      // Lógica de salvamento final
    } else {
      this.form.markAllAsTouched();
    }
  }
}