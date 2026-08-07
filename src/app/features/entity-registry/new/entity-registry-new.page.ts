// src/app/features/entity-registry/new/entity-registry-new.page.ts
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { EntityRegistryStore } from '../entity-registry.store';
import { EntityRegistryService } from '../entity-registry.service';
import { EntityRegistryPayload, ENTITY_STATUS_OPTIONS } from '../entity-registry.model';
import { maskCnpj, maskPhone } from '../../../shared/utils/format';

@Component({
  selector: 'app-entity-registry-new',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, NgIf, RouterLink],
  templateUrl: './entity-registry-new.page.html',
  styleUrls: ['./entity-registry-new.page.scss'],
})
export class EntityRegistryNewPage {
  private readonly fb     = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly svc    = inject(EntityRegistryService);
  protected readonly store = inject(EntityRegistryStore);

  protected activeTab: 'certificado' | 'contador' = 'certificado';

  // Estado dos uploads (certificado / logotipo).
  protected readonly uploadingCert = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly certFileName  = signal<string | null>(null);
  protected readonly logoFileName  = signal<string | null>(null);
  protected readonly uploadError   = signal<string | null>(null);

  // BK-16: consulta CNPJ na Receita Federal.
  protected readonly cnpjLoading = signal(false);
  protected readonly cnpjError   = signal<string | null>(null);

  protected readonly ufOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
    'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
  ];

  protected readonly statusOptions = ENTITY_STATUS_OPTIONS;

  protected readonly form = this.fb.group({
    cnpj:                  ['', Validators.required],
    stateRegistration:     [''],
    constitutionDate:      [''],
    legalName:             ['', Validators.required],
    tradeName:             ['', Validators.required],
    status:                ['Active'],
    zipCode:               ['', Validators.required],
    address:               ['', Validators.required],
    number:                ['', Validators.required],
    complement:            [''],
    district:              [''],
    city:                  ['', Validators.required],
    state:                 ['', Validators.required],
    mainPhone:             ['', Validators.required],
    cellPhone:             ['', Validators.required],
    directorEmail:         ['', [Validators.required, Validators.email]],
    digitalCertPassword:   [''],
    digitalCertFileUrl:    [''],
    digitalCertFileKey:    [''],
    logoUrl:               [''],
    accountantName:        ['', Validators.required],
    accountantCpf:         ['', Validators.required],
    accountantCrc:         ['', Validators.required],
    accountantZipCode:     ['', Validators.required],
    accountantAddress:     ['', Validators.required],
    accountantNumber:      ['', Validators.required],
    accountantComplement:  [''],
    accountantPhone:       ['', Validators.required],
    accountantEmail:       ['', [Validators.required, Validators.email]],
    accountantOffice:      ['', Validators.required],
    accountantOfficePhone: ['', Validators.required],
  });

  // ── Uploads (certificado / logotipo) via /upload/one-file ──────────────────

  onCertSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingCert.set(true);
    this.uploadError.set(null);
    this.svc.uploadFile(file).subscribe({
      next: res => {
        this.form.patchValue({ digitalCertFileUrl: res.url, digitalCertFileKey: res.key });
        this.certFileName.set(file.name);
        this.uploadingCert.set(false);
      },
      error: () => {
        this.uploadError.set('Falha ao enviar o certificado. Tente novamente.');
        this.uploadingCert.set(false);
      },
    });
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingLogo.set(true);
    this.uploadError.set(null);
    this.svc.uploadFile(file).subscribe({
      next: res => {
        this.form.patchValue({ logoUrl: res.url });
        this.logoFileName.set(file.name);
        this.uploadingLogo.set(false);
      },
      error: () => {
        this.uploadError.set('Falha ao enviar o logotipo. Tente novamente.');
        this.uploadingLogo.set(false);
      },
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const onlyNumbers = (v: string | undefined) => v ? v.replace(/\D/g, '') : '';

    const payload: EntityRegistryPayload = {
      ...raw,
      cnpj:                  onlyNumbers(raw.cnpj),
      zipCode:               onlyNumbers(raw.zipCode),
      mainPhone:             onlyNumbers(raw.mainPhone),
      cellPhone:             onlyNumbers(raw.cellPhone),
      accountantCpf:         onlyNumbers(raw.accountantCpf),
      accountantZipCode:     onlyNumbers(raw.accountantZipCode),
      accountantPhone:       onlyNumbers(raw.accountantPhone),
      accountantOfficePhone: onlyNumbers(raw.accountantOfficePhone),
    } as EntityRegistryPayload;

    const ok = await this.store.createEntity(payload);
    if (ok) this.router.navigate(['/entity-registry']);
  }

  // ── Máscaras (o submit já envia só os dígitos via onlyNumbers) ─────────────
  onCnpjInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskCnpj(el.value);
    this.form.get('cnpj')?.setValue(el.value, { emitEvent: false });
  }

  onPhoneInput(event: Event, control: 'mainPhone' | 'cellPhone'): void {
    const el = event.target as HTMLInputElement;
    el.value = maskPhone(el.value);
    this.form.get(control)?.setValue(el.value, { emitEvent: false });
  }

  // ── BK-16: busca na Receita ao completar o CNPJ ────────────────────────────
  onCnpjBlur(): void {
    const digits = (this.form.get('cnpj')?.value ?? '').replace(/\D/g, '');
    if (digits.length !== 14) return;

    this.cnpjLoading.set(true);
    this.cnpjError.set(null);

    this.svc.getCnpjData(digits).subscribe({
      next: data => {
        // Só sobrescreve o que a Receita devolver preenchido.
        const set = (ctrl: string, value: string | undefined) => {
          if (value) this.form.get(ctrl)?.setValue(value);
        };
        set('legalName',     data.razaoSocial);
        set('tradeName',     data.nomeFantasia);
        set('address',       data.logradouro);
        set('number',        data.numero);
        set('complement',    data.complemento);
        set('district',      data.bairro);
        set('city',          data.municipio);
        set('state',         data.uf);
        set('directorEmail', data.email);
        if (data.cep)      this.form.get('zipCode')?.setValue(data.cep);
        if (data.telefone) this.form.get('mainPhone')?.setValue(maskPhone(data.telefone));
        this.cnpjLoading.set(false);
      },
      error: err => {
        this.cnpjError.set(err?.error?.message ?? 'Não foi possível consultar o CNPJ.');
        this.cnpjLoading.set(false);
      },
    });
  }
}
