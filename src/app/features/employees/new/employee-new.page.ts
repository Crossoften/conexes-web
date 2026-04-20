// src/app/features/employees/new/employee-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

type EmployeeTab = 'PARAMS' | 'BOLETO';

@Component({
  selector: 'app-employee-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './employee-new.page.html',
  styleUrl: './employee-new.page.scss',
})
export class EmployeeNewPage {
  form: FormGroup;
  activeTab: EmployeeTab = 'PARAMS';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Aba: Configurações de parâmetros (Dados Gerais - Colaboradores)
      entidade: ['', Validators.required],
      tipoResponsavel: ['', Validators.required],
      cargo: ['', Validators.required],
      
      formacao: ['', Validators.required],
      vinculo: ['', Validators.required],
      cargaHorariaMensal: ['', Validators.required],
      
      dataAdmissao: ['', Validators.required],
      dataDemissao: ['', Validators.required],
      cns: ['', Validators.required],
      salario: ['', Validators.required],
      
      cpf: ['', Validators.required],
      orgaoClasse: [''],
      emailInstitucional: [''],
      emailPessoal: [''],
      
      cep: ['', Validators.required],
      endereco: ['', Validators.required],
      nro: ['', Validators.required],
      complemento: [''],
      
      telefone: ['', Validators.required],
      celular: [''],

      // Aba: Dados para emissão de boleto (Dados Gerais - Pagamentos)
      parceria: ['', Validators.required],
      origemRecurso: ['', Validators.required],
      referencia: ['', Validators.required],
      cargaHorariaPag: ['', Validators.required],
      valorBruto: [''],
      cargaHorariaPag2: ['', Validators.required] // Repetido conforme mockup
    });
  }

  setTab(tab: EmployeeTab) {
    this.activeTab = tab;
  }

  resetForm() {
    this.form.reset();
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.value);
      // Lógica de salvamento aqui
    } else {
      this.form.markAllAsTouched();
    }
  }
}