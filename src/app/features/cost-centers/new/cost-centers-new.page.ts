// src/app/features/cost-centers/new/cost-centers-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-cost-centers-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './cost-centers-new.page.html',
  styleUrl: './cost-centers-new.page.scss',
})
export class CostCentersNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      projectType: ['', Validators.required],
      projectCode: ['', Validators.required],
      projectTitle: ['', Validators.required],
      accountingCode: [''],
      payingSource: [''],
      startDate: [''],
      categoryDescription: [''],
      restrictInterest: [false],
      budgetRestriction: [''],
      linkedAccount: ['', Validators.required]
    });
  }

  resetForm() {
    this.form.reset({
      projectType: '',
      projectCode: '',
      accountingCode: '',
      payingSource: '',
      restrictInterest: false,
      linkedAccount: ''
    });
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.value);
      // Lógica de salvamento e navegação para o próximo passo
    } else {
      this.form.markAllAsTouched();
    }
  }
}