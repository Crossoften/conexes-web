// src/app/features/purchasing-registries/new/purchasing-registries-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-purchasing-registries-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './purchasing-registries-new.page.html',
  styleUrl: './purchasing-registries-new.page.scss',
})
export class PurchasingRegistriesNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      productName: ['', Validators.required],
      manufacturer: ['', Validators.required],
      group: ['', Validators.required],
      measureType: ['', Validators.required],
      
      baseCost: [''],
      origin: [''],
      defaultAccount: [''],
      
      description: ['']
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