// src/app/features/agencies/new/agency-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AgenciesService } from '../agencies.service';
import { AgencyPayload } from '../agencies.model';
import { onlyDigits } from '../../../shared/utils/format';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-agency-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './agency-new.page.html',
  styleUrl: './agency-new.page.scss',
})
export class AgencyNewPage {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(AgenciesService);
  private notify = inject(NotificationService);

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    cnpj:           ['', Validators.required],
    razaoSocial:    ['', Validators.required],
    nomeFantasia:   ['', Validators.required],
    emancipacao:    [''],
    cep:            ['', Validators.required],
    endereco:       ['', Validators.required],
    nro:            ['', Validators.required],
    complemento:    [''],
    orgaoGestor:    ['', Validators.required],
    telefoneCelular:[''],
    email:          ['', Validators.email],
  });

  // ── Máscaras ──────────────────────────────────────────────────────────────

  applyCnpjMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 14);
    const masked = digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    input.value = masked;
    this.form.get('cnpj')?.setValue(masked, { emitEvent: false });
  }

  applyCepMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
    input.value = masked;
    this.form.get('cep')?.setValue(masked, { emitEvent: false });
  }

  applyPhoneMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.form.get('telefoneCelular')?.setValue(masked, { emitEvent: false });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  onSaveDraft(): void {
    localStorage.setItem('agency_draft', JSON.stringify(this.form.value));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: AgencyPayload = {
      cnpj:          onlyDigits(v.cnpj),
      legalName:     v.razaoSocial   ?? '',
      tradeName:     v.nomeFantasia  ?? '',
      emancipation:  v.emancipacao ? new Date(v.emancipacao).toISOString() : null,
      zipCode:       onlyDigits(v.cep),
      address:       v.endereco      ?? '',
      number:        v.nro           ?? '',
      complement:    v.complemento   ?? '',
      managingOrgan: v.orgaoGestor   ?? '',
      phone:         onlyDigits(v.telefoneCelular),
      email:         v.email         ?? '',
      logo:          '',
      staff:         [],
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Órgão cadastrado com sucesso.');
        this.router.navigate(['/agencies']);
      },
      error: err => {
        this.loading.set(false);
        const raw = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        const msg = Array.isArray(raw) ? raw.join(', ') : raw;
        this.errorMsg.set(msg);
        this.notify.error(msg);
      },
    });
  }
}
