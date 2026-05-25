// src/app/features/users/new/user-new/user-new.page.ts
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { UsersService } from '../../users.service';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './user-new.page.html',
  styleUrl: './user-new.page.scss',
})
export class UserNewPage {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(UsersService);

  readonly roleOptions = [
    { label: 'Master',   value: 'Master'   },
    { label: 'Admin',    value: 'Admin'    },
    { label: 'Gerente',  value: 'Manager'  },
    { label: 'Operador', value: 'Operator' },
    { label: 'Viewer',   value: 'Viewer'   },
  ];

  form: FormGroup = this.fb.group({
    firstName:  ['', Validators.required],
    lastName:   ['', Validators.required],
    cpf:        ['', Validators.required],
    jobTitle:   [''],
    area:       [''],
    phone:      [''],
    email:      ['', [Validators.required, Validators.email]],
    username:   ['', Validators.required],
    role:       ['', Validators.required],
    password:   ['', [Validators.required, Validators.minLength(6)]],
  });

  // ── Máscaras ──────────────────────────────────────────────────────────────

  applyCpfMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = masked;
    this.form.get('cpf')?.setValue(masked, { emitEvent: false });
  }

  applyPhoneMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.form.get('phone')?.setValue(masked, { emitEvent: false });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset();
    this.svc.clearDraft();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;

    // Salva os dados do step 1 no service para uso no step 2
    this.svc.saveDraft({
      name:     v.firstName ?? '',
      surname:  v.lastName  ?? '',
      email:    v.email     ?? '',
      document: v.cpf       ?? '',
      jobTitle: v.jobTitle  ?? '',
      area:     v.area      ?? '',
      phone:    v.phone     ?? '',
      role:     v.role      ?? 'Viewer',
      status:   'Active',
      password: v.password  ?? '',
    });

    // Navega para o step 2 (permissões)
    this.router.navigate(['/users/new-permission']);
  }
}
