// features/profile/profile.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../shared/services/notification.service';
import { ProfileService, UpdateProfilePayload } from './profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ProfileService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  private userId = 0;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPassword = signal(false);
  readonly email = signal('');
  readonly role = signal('');

  readonly form = this.fb.group({
    name:     ['', Validators.required],
    phone:    [''],
    jobTitle: [''],
    area:     [''],
    document: [''],
  });

  readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmation:    ['', Validators.required],
  });

  ngOnInit(): void {
    this.service.getMe().subscribe({
      next: me => {
        this.userId = me.id;
        this.email.set(me.email ?? '');
        this.role.set(me.role ?? '');
        this.form.patchValue({
          name:     me.name ?? '',
          phone:    me.phone ?? '',
          jobTitle: me.jobTitle ?? '',
          area:     me.area ?? '',
          document: me.document ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Não foi possível carregar seu perfil.');
      },
    });
  }

  get initials(): string {
    return (this.form.value.name ?? '')
      .split(' ').filter(Boolean).slice(0, 2)
      .map(p => p[0]?.toUpperCase()).join('') || '?';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha o nome.');
      return;
    }
    this.saving.set(true);
    const payload: UpdateProfilePayload = {
      name:     this.form.value.name ?? '',
      phone:    this.form.value.phone ?? '',
      jobTitle: this.form.value.jobTitle ?? '',
      area:     this.form.value.area ?? '',
      document: this.form.value.document ?? '',
    };
    this.service.update(this.userId, payload).subscribe({
      next: async () => {
        await this.auth.refreshProfile();
        this.saving.set(false);
        this.notify.success('Perfil atualizado com sucesso.');
      },
      error: () => {
        this.saving.set(false);
        this.notify.error('Não foi possível salvar o perfil.');
      },
    });
  }

  savePassword(): void {
    const { currentPassword, password, confirmation } = this.passwordForm.value;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.notify.error('Informe a senha atual e uma nova senha com ao menos 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      this.notify.error('As senhas não coincidem.');
      return;
    }
    this.savingPassword.set(true);
    this.service.changePassword(currentPassword ?? '', password ?? '').subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.notify.success('Senha alterada com sucesso.');
      },
      error: err => {
        this.savingPassword.set(false);
        this.notify.error(err?.error?.message ?? 'Não foi possível alterar a senha.');
      },
    });
  }
}
