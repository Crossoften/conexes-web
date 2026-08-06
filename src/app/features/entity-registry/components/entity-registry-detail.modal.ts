// src/app/features/entity-registry/components/entity-registry-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  EntityRegistry,
  EntityRegistryPayload,
  ENTITY_STATUS_OPTIONS,
} from '../entity-registry.model';

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

  protected mode: 'view' | 'edit' = 'view';
  protected activeTab: 'geral' | 'contador' = 'geral';
  protected showRequiredWarning = false;

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
    }
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
