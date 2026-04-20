// src/app/features/financial-transfers/new/financial-transfer-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-financial-transfer-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './financial-transfer-new.page.html',
  styleUrl: './financial-transfer-new.page.scss',
})
export class FinancialTransferNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      description: ['', Validators.required],
      origin: ['', Validators.required],
      destination: ['', Validators.required],
      
      operationDate: ['', Validators.required],
      transferValue: ['', Validators.required],
      differentDateCredit: [''],
      
      observations: ['']
    });
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