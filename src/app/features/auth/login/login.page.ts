import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private auth   = inject(AuthService);

  loading      = signal(false);
  showPassword = signal(false);
  errorMsg     = signal<string | null>(null);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    try {
      await this.auth.login(
        this.email.value!,
        this.password.value!,
      );

      this.router.navigate(['/stakeholders']);
    } catch {
      this.errorMsg.set('E-mail ou senha incorretos. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  onGoogle() {}
  onFacebook() {}
}