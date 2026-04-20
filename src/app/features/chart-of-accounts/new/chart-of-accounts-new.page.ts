// src/app/features/chart-of-accounts/new/chart-of-accounts-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-chart-of-accounts-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './chart-of-accounts-new.page.html',
  styleUrl: './chart-of-accounts-new.page.scss',
})
export class ChartOfAccountsNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      categoryType: ['', Validators.required],
      accountType: [''],
      costCenter: [''],
      categoryCode: ['', Validators.required],
      categoryTitle: ['', Validators.required],
      provCredit: [''],
      provDebit: [''],
      writeOffCredit: [''],
      writeOffDebit: [''],
      description: ['']
    });
  }

  resetForm() {
    this.form.reset({
      categoryType: '',
      accountType: '',
      costCenter: ''
    });
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.value);
      // Lógica de salvamento e navegação para o "Próximo" passo
    } else {
      this.form.markAllAsTouched();
    }
  }
}