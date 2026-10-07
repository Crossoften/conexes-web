// src/app/features/auth/invite/invite.page.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InvitePreview, InviteService } from './invite.service';

/** As duas senhas têm de bater — validador no nível do formulário. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm  = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './invite.page.html',
  styleUrl: '../auth-card.scss',
})
export class InvitePage implements OnInit {
  private fb      = inject(FormBuilder);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private service = inject(InviteService);

  private token = '';

  checking     = signal(true);
  saving       = signal(false);
  done         = signal(false);
  showPassword = signal(false);
  invalidMsg   = signal<string | null>(null);
  errorMsg     = signal<string | null>(null);
  invite       = signal<InvitePreview | null>(null);

  form = this.fb.group({
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    surname:         [''],
    phone:           [''],
    document:        [''],
    jobTitle:        [''],
    area:            [''],
  }, { validators: passwordsMatch });

  get password()        { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.checking.set(false);
      this.invalidMsg.set('Link de convite incompleto. Abra o link exatamente como veio no e-mail.');
      return;
    }

    this.service.find(this.token).subscribe({
      next: data => {
        this.invite.set(data);
        // O gerencial pode já ter preenchido parte do cadastro — não faz a pessoa redigitar.
        this.form.patchValue({
          surname:  data.surname  ?? '',
          phone:    data.phone    ?? '',
          document: data.document ?? '',
          jobTitle: data.jobTitle ?? '',
          area:     data.area     ?? '',
        });
        this.checking.set(false);
      },
      error: err => {
        this.checking.set(false);
        this.invalidMsg.set(
          err?.error?.message ?? 'Convite inválido ou expirado. Peça um novo ao administrador.',
        );
      },
    });
  }

  togglePassword() { this.showPassword.update(v => !v); }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    const v = this.form.getRawValue();

    this.service.accept({
      token:           this.token,
      password:        v.password!,
      confirmPassword: v.confirmPassword!,
      surname:         v.surname   || undefined,
      phone:           v.phone     || undefined,
      document:        v.document  || undefined,
      jobTitle:        v.jobTitle  || undefined,
      area:            v.area      || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.done.set(true);
      },
      error: err => {
        this.saving.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Não foi possível concluir o cadastro. Tente novamente.');
      },
    });
  }

  goToLogin() { this.router.navigate(['/auth/login']); }
}
