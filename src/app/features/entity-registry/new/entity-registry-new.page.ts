import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-entity-registry-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './entity-registry-new.page.html',
  styleUrl: './entity-registry-new.page.scss',
})
export class EntityRegistryNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      cnpj: ['', Validators.required],
      stateRegistration: [''],
      constitutionDate: [''],
      legalName: ['', Validators.required],
      tradeName: ['', Validators.required],
      zipCode: ['', Validators.required],
      address: ['', Validators.required],
      number: ['', Validators.required],
      complement: [''],
      phone: ['', Validators.required],
      mobile: ['', Validators.required],
      managerEmail: ['', [Validators.required, Validators.email]],
      certPassword: ['']
    });
  }

  saveDraft() {
    console.log('Salvando rascunho...', this.form.value);
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Dados da Entidade:', this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}