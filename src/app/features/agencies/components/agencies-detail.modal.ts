// src/app/features/agencies/components/agencies-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, inject } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Agency, AgencyUpdatePayload, AGENCY_STATUS_CONFIG } from '../agencies.model';

@Component({
  selector: 'app-agency-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, ReactiveFormsModule],
  templateUrl: './agencies-detail.modal.html',
  styleUrl: './agencies-detail.modal.scss',
})
export class AgencyDetailModalComponent implements OnChanges {
  @Input() agency:  Agency | null = null;
  @Input() loading  = false;

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<AgencyUpdatePayload>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected mode: 'view' | 'edit' = 'view';

  readonly statusConfig = AGENCY_STATUS_CONFIG;

  protected readonly form = this.fb.group({
    cnpj:          ['', Validators.required],
    legalName:     ['', Validators.required],
    tradeName:     ['', Validators.required],
    emancipation:  [''],
    zipCode:       ['', Validators.required],
    address:       ['', Validators.required],
    number:        ['', Validators.required],
    complement:    [''],
    managingOrgan: ['', Validators.required],
    phone:         [''],
    email:         ['', Validators.email],
  });

  ngOnChanges(): void {
    if (this.agency) {
      this.form.patchValue({
        cnpj:          this.agency.cnpj          ?? '',
        legalName:     this.agency.legalName      ?? '',
        tradeName:     this.agency.tradeName      ?? '',
        emancipation:  this.agency.emancipation   ?? '',
        zipCode:       this.agency.zipCode        ?? '',
        address:       this.agency.address        ?? '',
        number:        this.agency.number         ?? '',
        complement:    this.agency.complement     ?? '',
        managingOrgan: this.agency.managingOrgan  ?? '',
        phone:         this.agency.phone          ?? '',
        email:         this.agency.email          ?? '',
      });
    }
  }

  get statusLabel(): string {
    if (!this.agency?.status) return '—';
    return this.statusConfig[this.agency.status]?.label ?? this.agency.status;
  }

  get statusVariant(): string {
    if (!this.agency?.status) return 'neutral';
    return this.statusConfig[this.agency.status]?.variant ?? 'neutral';
  }

  onClose(): void {
    this.mode = 'view';
    this.close.emit();
  }

  onEdit(): void {
    this.mode = 'edit';
  }

  onCancelEdit(): void {
    this.mode = 'view';
    if (this.agency) this.ngOnChanges();
  }

  onDelete(): void {
    if (this.agency) this.delete.emit(this.agency.id);
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
    this.form.get('zipCode')?.setValue(masked, { emitEvent: false });
  }

  applyPhoneMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.form.get('phone')?.setValue(masked, { emitEvent: false });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const payload: AgencyUpdatePayload = {
      cnpj:          raw.cnpj          || undefined,
      legalName:     raw.legalName     || undefined,
      tradeName:     raw.tradeName     || undefined,
      emancipation:  raw.emancipation  || undefined,
      zipCode:       raw.zipCode       || undefined,
      address:       raw.address       || undefined,
      number:        raw.number        || undefined,
      complement:    raw.complement    || undefined,
      managingOrgan: raw.managingOrgan || undefined,
      phone:         raw.phone         || undefined,
      email:         raw.email         || undefined,
    };

    this.saved.emit(payload);
  }
}