// src/app/features/agencies/new/agency-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AgenciesService } from '../agencies.service';
import { AgencyPayload, AgencyStaff, AGENCY_SERVER_TYPE_OPTIONS } from '../agencies.model';
import { onlyDigits } from '../../../shared/utils/format';
import { NotificationService } from '../../../shared/services/notification.service';
import { UploadService } from '../../../shared/services/upload.service';

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
  private upload = inject(UploadService);

  readonly serverTypeOptions = AGENCY_SERVER_TYPE_OPTIONS;

  readonly loading       = signal(false);
  readonly errorMsg      = signal<string | null>(null);
  readonly logoUrl       = signal<string>('');
  readonly logoName      = signal<string>('');
  readonly logoUploading = signal(false);

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
    portalTransparencia: [''],
    staff:          this.fb.array([]),
  });

  // ── Equipe / Servidores (staff) ─────────────────────────────────────────────

  get staff(): FormArray {
    return this.form.get('staff') as FormArray;
  }

  private newStaff(): FormGroup {
    return this.fb.group({
      serverType:         [''],
      jobTitle:           [''],
      name:               ['', Validators.required],
      appointmentAct:     [''],
      birthDate:          [''],
      rg:                 [''],
      cpf:                [''],
      phone:              [''],
      zipCode:            [''],
      address:            [''],
      number:             [''],
      complement:         [''],
      institutionalEmail: [''],
      personalEmail:      [''],
    });
  }

  addStaff(): void { this.staff.push(this.newStaff()); }
  removeStaff(i: number): void { this.staff.removeAt(i); }

  // ── Upload de logo ──────────────────────────────────────────────────────────

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.logoUploading.set(true);
    this.upload.uploadOneFile(file).subscribe({
      next: res => {
        this.logoUploading.set(false);
        this.logoUrl.set(res.fileUrl);
        this.logoName.set(file.name);
        this.notify.success('Logotipo enviado.');
      },
      error: () => {
        this.logoUploading.set(false);
        this.notify.error('Erro ao enviar o logotipo.');
      },
    });
  }

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

    // Campos com validação de formato no back (email/data) não podem ir como ''
    // — quando vazios, são omitidos (undefined) para não disparar erro de validação.
    const staff: AgencyStaff[] = this.staff.controls.map(ctrl => {
      const s = ctrl.value;
      return {
        ...s,
        cpf:                onlyDigits(s.cpf),
        phone:              onlyDigits(s.phone),
        zipCode:            onlyDigits(s.zipCode),
        birthDate:          s.birthDate ? new Date(s.birthDate).toISOString() : undefined,
        institutionalEmail: s.institutionalEmail || undefined,
        personalEmail:      s.personalEmail || undefined,
      } as AgencyStaff;
    });

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
      phone:           onlyDigits(v.telefoneCelular),
      email:           v.email || undefined,
      transparencyUrl: v.portalTransparencia || undefined,
      logo:            this.logoUrl(),
      staff,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Órgão cadastrado com sucesso.');
        this.router.navigate(['/agencies']);
      },
      error: () => {
        this.loading.set(false);
        // Não expor mensagens cruas do validador do back-end (ex.: "email must
        // be an email"). Mensagem genérica e amigável para o usuário.
        const msg = 'Não foi possível salvar o órgão. Verifique os dados e tente novamente.';
        this.errorMsg.set(msg);
        this.notify.error(msg);
      },
    });
  }
}
