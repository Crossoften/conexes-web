// src/app/features/users/new/user-new/user-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './user-new.page.html',
  styleUrl: './user-new.page.scss',
})
export class UserNewPage {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      cpf: ['', Validators.required],
      company: ['', Validators.required],
      role: ['', Validators.required],
      area: ['', Validators.required],
      cellphone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      permissionProfile: ['', Validators.required]
    });
  }

  resetForm() {
    this.form.reset();
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('User Data:', this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}