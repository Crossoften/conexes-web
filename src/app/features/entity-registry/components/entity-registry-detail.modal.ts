// src/app/features/entity-registry/components/entity-registry-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EntityRegistry,
  EntityRegistryPayload,
  ENTITY_STATUS_CONFIG,
  ENTITY_TYPE_LABELS,
} from '../entity-registry.model';

@Component({
  selector: 'app-entity-registry-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, ReactiveFormsModule],
  templateUrl: './entity-registry-detail.modal.html',
  styleUrl: './entity-registry-detail.modal.scss',
})
export class EntityRegistryDetailModalComponent implements OnChanges {
  @Input() entity:  EntityRegistry | null = null;
  @Input() loading  = false;

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<Partial<EntityRegistryPayload>>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected mode: 'view' | 'edit' = 'view';
  protected activeTab: 'geral' | 'contador' = 'geral';

  readonly statusConfig = ENTITY_STATUS_CONFIG;
  readonly typeLabels   = ENTITY_TYPE_LABELS;

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

  ngOnChanges(): void {
    if (this.entity) {
      this.form.patchValue(this.entity as any);
    }
  }

  get statusLabel(): string {
    if (!this.entity) return '';
    return this.statusConfig[this.entity.status]?.label ?? this.entity.status;
  }

  get statusVariant(): string {
    if (!this.entity) return '';
    return this.statusConfig[this.entity.status]?.variant ?? 'neutral';
  }

  get typeLabel(): string {
    if (!this.entity) return '';
    return this.typeLabels[this.entity.type] ?? this.entity.type;
  }

  onClose(): void {
    this.mode = 'view';
    this.activeTab = 'geral';
    this.close.emit();
  }

  onEdit(): void {
    this.mode = 'edit';
  }

  onCancelEdit(): void {
    this.mode = 'view';
    if (this.entity) this.form.patchValue(this.entity as any);
  }

  onDelete(): void {
    if (this.entity) this.delete.emit(this.entity.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const onlyNumbers = (v: string | undefined) => v ? v.replace(/\D/g, '') : '';

    const payload: Partial<EntityRegistryPayload> = {
      ...raw,
      cnpj:                  onlyNumbers(raw.cnpj),
      zipCode:               onlyNumbers(raw.zipCode),
      mainPhone:             onlyNumbers(raw.mainPhone),
      cellPhone:             onlyNumbers(raw.cellPhone),
      accountantCpf:         onlyNumbers(raw.accountantCpf),
      accountantZipCode:     onlyNumbers(raw.accountantZipCode),
      accountantPhone:       onlyNumbers(raw.accountantPhone),
      accountantOfficePhone: onlyNumbers(raw.accountantOfficePhone),
    };

    this.saved.emit(payload);
  }
}
