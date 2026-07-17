// src/app/features/entity-registry/new/entity-registry-new.page.ts
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { EntityRegistryStore } from '../entity-registry.store';
import { EntityRegistryPayload } from '../entity-registry.model';

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
  protected readonly store = inject(EntityRegistryStore);

  protected activeTab: 'certificado' | 'contador' = 'certificado';

  protected readonly ufOptions = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
    'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
  ];

  protected readonly form = this.fb.group({
    cnpj:                  ['', Validators.required],
    stateRegistration:     [''],
    constitutionDate:      [''],
    legalName:             ['', Validators.required],
    tradeName:             ['', Validators.required],
    zipCode:               ['', Validators.required],
    address:               ['', Validators.required],
    number:                ['', Validators.required],
    complement:            [''],
    city:                  ['', Validators.required],
    state:                 ['', Validators.required],
    mainPhone:             ['', Validators.required],
    cellPhone:             ['', Validators.required],
    directorEmail:         ['', [Validators.required, Validators.email]],
    digitalCertPassword:   [''],
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
}
