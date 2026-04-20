// src/app/features/approval-tiers/new/approval-tiers-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-approval-tiers-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './approval-tiers-new.page.html',
  styleUrl: './approval-tiers-new.page.scss',
})
export class ApprovalTiersNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      description: ['', Validators.required],
      approver: ['', Validators.required],
      tierLevel: ['', Validators.required],
      minValue: ['', Validators.required],
      maxValue: ['', Validators.required]
    });
  }

  resetForm() {
    this.form.reset({
      description: '',
      approver: '',
      tierLevel: '',
      minValue: '',
      maxValue: ''
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