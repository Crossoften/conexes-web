// src/app/features/auth/forgot-password/forgot-password.page.ts
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ForgotPasswordService } from './forgot-password.service';

/** As duas senhas têm de bater — validador no nível do formulário. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm  = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

type Step = 'email' | 'reset' | 'done';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.page.html',
  styleUrl: '../auth-card.scss',
})
export class ForgotPasswordPage {
  private fb      = inject(FormBuilder);
  private router  = inject(Router);
  private service = inject(ForgotPasswordService);

  step         = signal<Step>('email');
  loading      = signal(false);
  showPassword = signal(false);
  errorMsg     = signal<string | null>(null);
  sentTo       = signal('');

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetForm = this.fb.group({
    code:            ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  get email()           { return this.emailForm.get('email')!; }
  get code()            { return this.resetForm.get('code')!; }
  get password()        { return this.resetForm.get('password')!; }
  get confirmPassword() { return this.resetForm.get('confirmPassword')!; }

  togglePassword() { this.showPassword.update(v => !v); }

  onRequestCode() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    const email = this.email.value!.trim();

    this.service.requestCode(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sentTo.set(email);
        this.step.set('reset');
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.status === 404
            ? 'Não encontramos uma conta com esse e-mail.'
            : (err?.error?.message ?? 'Não foi possível enviar o código. Tente novamente.'),
        );
      },
    });
  }

  onReset() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    const v = this.resetForm.getRawValue();

    this.service.reset(v.code!.trim(), v.password!, v.confirmPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('done');
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Código inválido ou expirado. Solicite um novo.');
      },
    });
  }

  backToEmail() {
    this.errorMsg.set(null);
    this.resetForm.reset();
    this.step.set('email');
  }

  goToLogin() { this.router.navigate(['/auth/login']); }
}
