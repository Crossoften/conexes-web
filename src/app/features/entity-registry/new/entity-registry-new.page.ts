import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { EntityRegistryStore } from '../entity-registry.store'; // CORREÇÃO: Ajustado caminho relativo para '../'

@Component({
  selector: 'app-entity-registry-new',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, NgIf, RouterLink],
  templateUrl: './entity-registry-new.page.html',
  styleUrls: ['./entity-registry-new.page.scss']
})
export class EntityRegistryNewPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  protected readonly store = inject(EntityRegistryStore); // Agora resolvido sem tipo 'unknown'

  protected activeTab: 'certificado' | 'contador' = 'certificado';

  protected readonly form = this.fb.group({
    cnpj: ['', [Validators.required]],
    stateRegistration: [''],
    constitutionDate: [''],
    legalName: ['', [Validators.required]],
    tradeName: ['', [Validators.required]],
    zipCode: ['', [Validators.required]],
    address: ['', [Validators.required]],
    number: ['', [Validators.required]],
    complement: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    mainPhone: ['', [Validators.required]],
    cellPhone: ['', [Validators.required]],
    directorEmail: ['', [Validators.required, Validators.email]],
    digitalCertPassword: [''],
    accountantName: ['', [Validators.required]],
    accountantCpf: ['', [Validators.required]],
    accountantCrc: ['', [Validators.required]],
    accountantZipCode: ['', [Validators.required]],
    accountantAddress: ['', [Validators.required]],
    accountantNumber: ['', [Validators.required]],
    accountantComplement: [''],
    accountantPhone: ['', [Validators.required]],
    accountantEmail: ['', [Validators.required, Validators.email]],
    accountantOffice: ['', [Validators.required]],
    accountantOfficePhone: ['', [Validators.required]]
  });

  onSubmit() {
    if (this.form.valid) {
      const rawValues = this.form.value;
      const keepOnlyNumbers = (value: string | undefined) => value ? value.replace(/\D/g, '') : '';

      const payload = {
        ...rawValues,
        cnpj: keepOnlyNumbers(rawValues.cnpj),
        zipCode: keepOnlyNumbers(rawValues.zipCode),
        accountantCpf: keepOnlyNumbers(rawValues.accountantCpf),
        accountantZipCode: keepOnlyNumbers(rawValues.accountantZipCode),
        mainPhone: keepOnlyNumbers(rawValues.mainPhone),
        cellPhone: keepOnlyNumbers(rawValues.cellPhone),
        accountantPhone: keepOnlyNumbers(rawValues.accountantPhone),
        accountantOfficePhone: keepOnlyNumbers(rawValues.accountantOfficePhone)
      };

      this.store.createEntityRegistry(payload);
      this.router.navigate(['/entity-registry']);
    } else {
      this.form.markAllAsTouched();
    }
  }

  saveDraft() {
    console.log('📝 Rascunho salvo:', this.form.value);
  }
}