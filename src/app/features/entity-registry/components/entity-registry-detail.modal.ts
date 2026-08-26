// src/app/features/entity-registry/components/entity-registry-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EntityRegistry,
  EntityRegistryPayload,
  ENTITY_STATUS_OPTIONS,
} from '../entity-registry.model';
import { EntityRegistryService } from '../entity-registry.service';
import { maskCnpj, maskPhone, maskCpf, maskCep } from '../../../shared/utils/format';

@Component({
  selector: 'app-entity-registry-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, ReactiveFormsModule],
  templateUrl: './entity-registry-detail.modal.html',
  styleUrl: './entity-registry-detail.modal.scss',
})
export class EntityRegistryDetailModalComponent implements OnChanges, OnInit {
  @Input() entity:  EntityRegistry | null = null;
  @Input() loading  = false;
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  @Input() initialMode: 'view' | 'edit' = 'view';

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<Partial<EntityRegistryPayload>>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly svc = inject(EntityRegistryService);

  protected mode: 'view' | 'edit' = 'view';
  protected activeTab: 'geral' | 'contador' | 'certificado' = 'geral';
  protected showRequiredWarning = false;

  // ENT-04: estado dos uploads (certificado / logotipo) na edição.
  protected readonly uploadingCert = signal(false);
  protected readonly uploadingLogo = signal(false);
  protected readonly certFileName  = signal<string | null>(null);
  protected readonly logoFileName  = signal<string | null>(null);
  protected readonly uploadError   = signal<string | null>(null);

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

  ngOnInit(): void {
    this.mode = this.initialMode;
  }

  ngOnChanges(): void {
    if (this.entity) {
      this.form.patchValue(this.entity as any);
      // Exibe os valores já mascarados ao abrir a edição.
      this.form.patchValue({
        cnpj:             maskCnpj(this.entity.cnpj),
        mainPhone:        maskPhone(this.entity.mainPhone),
        cellPhone:        maskPhone(this.entity.cellPhone),
        // B01: input type=date só exibe yyyy-MM-dd; o back devolve ISO completo.
        constitutionDate: this.entity.constitutionDate?.slice(0, 10) ?? '',
        // ENT-03: máscaras também na aba Dados do Contador ao abrir a edição.
        accountantCpf:         maskCpf((this.entity as any).accountantCpf),
        accountantZipCode:     maskCep((this.entity as any).accountantZipCode),
        accountantPhone:       maskPhone((this.entity as any).accountantPhone),
        accountantOfficePhone: maskPhone((this.entity as any).accountantOfficePhone),
      }, { emitEvent: false });
      // ENT-04: rótulo de "arquivo já enviado" quando a entidade já possui cert/logo.
      const certUrl = (this.entity as any).digitalCertFileUrl as string | undefined;
      const logoUrl = (this.entity as any).logoUrl as string | undefined;
      this.certFileName.set(certUrl ? decodeURIComponent(certUrl.split('/').pop() || 'Certificado atual') : null);
      this.logoFileName.set(logoUrl ? decodeURIComponent(logoUrl.split('/').pop() || 'Logotipo atual') : null);
    }
  }

  // ── Máscaras (o payload já envia só os dígitos via onlyNumbers no onSubmit) ──
  onCnpjInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskCnpj(el.value);
    this.form.get('cnpj')?.setValue(el.value, { emitEvent: false });
  }

  onPhoneInput(event: Event, control: 'mainPhone' | 'cellPhone' | 'accountantPhone' | 'accountantOfficePhone'): void {
    const el = event.target as HTMLInputElement;
    el.value = maskPhone(el.value);
    this.form.get(control)?.setValue(el.value, { emitEvent: false });
  }

  onCpfInput(event: Event, control: string): void {
    const el = event.target as HTMLInputElement;
    el.value = maskCpf(el.value);
    this.form.get(control)?.setValue(el.value, { emitEvent: false });
  }

  onCepInput(event: Event, control: string): void {
    const el = event.target as HTMLInputElement;
    el.value = maskCep(el.value);
    this.form.get(control)?.setValue(el.value, { emitEvent: false });
  }

  // ── ENT-04: uploads de certificado/logotipo na edição (via /upload/one-file) ─
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

  protected statusLabel(v: string | undefined): string {
    return this.statusOptions.find(o => o.value === v)?.label ?? (v || '—');
  }

  onClose(): void {
    this.mode = 'view';
    this.activeTab = 'geral';
    this.close.emit();
  }

  onEdit(): void {
    this.mode = 'edit';
    this.showRequiredWarning = false;
  }

  onCancelEdit(): void {
    this.mode = 'view';
    this.showRequiredWarning = false;
    if (this.entity) this.form.patchValue(this.entity as any);
  }

  onDelete(): void {
    if (this.entity) this.delete.emit(this.entity.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Se algum campo obrigatório estiver em outra aba, leva o usuário até ela.
      if (this.hasInvalidInTab('geral'))         this.activeTab = 'geral';
      else if (this.hasInvalidInTab('contador')) this.activeTab = 'contador';
      this.showRequiredWarning = true;
      return;
    }

    this.showRequiredWarning = false;
    const raw = this.form.value;
    const onlyNumbers = (v: string | undefined) => v ? v.replace(/\D/g, '') : '';

    const payload = {
      ...raw,
      constitutionDate:      raw.constitutionDate ? raw.constitutionDate : undefined,
      cnpj:                  onlyNumbers(raw.cnpj),
      zipCode:               onlyNumbers(raw.zipCode),
      mainPhone:             onlyNumbers(raw.mainPhone),
      cellPhone:             onlyNumbers(raw.cellPhone),
      accountantCpf:         onlyNumbers(raw.accountantCpf),
      accountantZipCode:     onlyNumbers(raw.accountantZipCode),
      accountantPhone:       onlyNumbers(raw.accountantPhone),
      accountantOfficePhone: onlyNumbers(raw.accountantOfficePhone),
    } as Partial<EntityRegistryPayload>;

    this.saved.emit(payload);
  }

  /** True se houver campo inválido na aba informada (geral = entidade; contador = accountant*). */
  private hasInvalidInTab(tab: 'geral' | 'contador'): boolean {
    return Object.entries(this.form.controls).some(([name, ctrl]) => {
      const isContador = name.startsWith('accountant');
      const inTab = tab === 'contador' ? isContador : !isContador;
      return inTab && ctrl.invalid;
    });
  }
}
