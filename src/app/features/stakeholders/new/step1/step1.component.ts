// src/app/features/stakeholders/new/step1/step1.component.ts
import { Component, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NgClass } from '@angular/common';
import { StakeholdersService } from '../../stakeholders.service';

type Step1Tab = 'rateio' | 'bancario';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss',
})
export class Step1Component {
  form = input.required<AbstractControl>();

  private svc = inject(StakeholdersService);

  activeTab   = signal<Step1Tab>('rateio');
  cnpjLoading = signal(false);
  cnpjError   = signal<string | null>(null);

  get f() { return (this.form() as any).controls; }

  isInvalid(field: string): boolean {
    const ctrl = this.f[field];
    return ctrl?.invalid && ctrl?.touched;
  }

  onDocumentBlur(): void {
    const personType = this.f['personType']?.value;
    const digits     = (this.f['document']?.value ?? '').replace(/\D/g, '');

    if (personType !== 'PJ' || digits.length !== 14) return;

    this.cnpjLoading.set(true);
    this.cnpjError.set(null);

    this.svc.getCnpjData(digits).subscribe({
      next: data => {
        // FE-S4: só preenche os campos que o CnpjLookupResponseDto do back realmente retorna.
        // naturezaJuridica / atividadeSecundaria / inscricaoEstadual não existem no contrato
        // — legalNature / secondActivity / stateReg ficam para preenchimento manual.
        this.f['name']?.setValue(data.razaoSocial          ?? '');
        this.f['email']?.setValue(data.email               ?? '');
        this.f['phone']?.setValue(data.telefone            ?? '');
        this.f['mainActivity']?.setValue(data.atividadePrincipal  ?? '');
        if (data.cep)         this.f['zipCode']?.setValue(data.cep);
        if (data.logradouro)  this.f['address']?.setValue(data.logradouro);
        if (data.numero)      this.f['addressNum']?.setValue(data.numero);
        if (data.complemento) this.f['complement']?.setValue(data.complemento);
        if (data.bairro)      this.f['district']?.setValue(data.bairro);
        if (data.municipio)   this.f['city']?.setValue(data.municipio);
        if (data.uf)          this.f['state']?.setValue(data.uf);
        this.cnpjLoading.set(false);
      },
      error: err => {
        this.cnpjError.set(err?.error?.message ?? 'Não foi possível consultar o CNPJ.');
        this.cnpjLoading.set(false);
      },
    });
  }

  applyDocumentMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 14);
    const isPF   = this.f['personType']?.value === 'PF';

    let masked = digits;
    if (isPF) {
      masked = digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      masked = digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    input.value = masked;
    this.f['document']?.setValue(masked, { emitEvent: false });
    this.cnpjError.set(null);
  }

  applyPhoneMask(event: Event, controlName: string): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.f[controlName]?.setValue(masked, { emitEvent: false });
  }

  applyCepMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
    input.value = masked;
    this.f['zipCode']?.setValue(masked, { emitEvent: false });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }
}