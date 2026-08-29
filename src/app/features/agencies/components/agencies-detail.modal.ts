// src/app/features/agencies/components/agencies-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NonNullableFormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Agency,
  AgencyStaff,
  AgencyUpdatePayload,
  AGENCY_STATUS_CONFIG,
  AGENCY_SERVER_TYPE_OPTIONS,
} from '../agencies.model';
import { onlyDigits } from '../../../shared/utils/format';
import { NotificationService } from '../../../shared/services/notification.service';
import { UploadService } from '../../../shared/services/upload.service';
import { AgenciesService } from '../agencies.service';

@Component({
  selector: 'app-agency-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, ReactiveFormsModule],
  templateUrl: './agencies-detail.modal.html',
  styleUrl: './agencies-detail.modal.scss',
})
export class AgencyDetailModalComponent implements OnChanges, OnInit {
  @Input() agency:  Agency | null = null;
  @Input() loading  = false;
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  @Input() initialMode: 'view' | 'edit' = 'view';

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<AgencyUpdatePayload>();

  private readonly fb     = inject(NonNullableFormBuilder);
  private readonly notify = inject(NotificationService);
  private readonly upload = inject(UploadService);
  private readonly svc    = inject(AgenciesService);

  protected mode: 'view' | 'edit' = 'view';

  readonly statusConfig     = AGENCY_STATUS_CONFIG;
  readonly serverTypeOptions = AGENCY_SERVER_TYPE_OPTIONS;

  readonly logoUrl       = signal<string>('');
  readonly logoName      = signal<string>('');
  readonly logoUploading = signal(false);

  protected readonly form = this.fb.group({
    cnpj:          ['', Validators.required],
    legalName:     ['', Validators.required],
    tradeName:     ['', Validators.required],
    emancipation:  [''],
    zipCode:       ['', Validators.required],
    address:       ['', Validators.required],
    number:        ['', Validators.required],
    complement:    [''],
    managingOrgan:   ['', Validators.required],
    phone:           [''],
    email:           ['', Validators.email],
    staff:           this.fb.array([] as FormGroup[]),
  });

  // ── Equipe / Servidores (staff) ─────────────────────────────────────────────

  get staff(): FormArray {
    return this.form.get('staff') as FormArray;
  }

  private newStaff(data?: Partial<AgencyStaff>): FormGroup {
    return this.fb.group({
      serverType:         [data?.serverType         ?? ''],
      jobTitle:           [data?.jobTitle           ?? ''],
      name:               [data?.name               ?? '', Validators.required],
      appointmentAct:     [data?.appointmentAct     ?? ''],
      birthDate:          [this.toDateInput(data?.birthDate)],
      rg:                 [data?.rg                 ?? ''],
      cpf:                [data?.cpf                ?? ''],
      phone:              [data?.phone              ?? ''],
      zipCode:            [data?.zipCode            ?? ''],
      address:            [data?.address            ?? ''],
      number:             [data?.number             ?? ''],
      complement:         [data?.complement         ?? ''],
      institutionalEmail: [data?.institutionalEmail ?? ''],
      personalEmail:      [data?.personalEmail      ?? ''],
    });
  }

  addStaff(): void { this.staff.push(this.newStaff()); }
  removeStaff(i: number): void { this.staff.removeAt(i); }

  /** ISO/`Date` → `yyyy-MM-dd` para o input[type=date]; vazio se inválido. */
  private toDateInput(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.mode = this.initialMode;
  }

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
        managingOrgan:   this.agency.managingOrgan  ?? '',
        phone:           this.agency.phone          ?? '',
        email:           this.agency.email          ?? '',
      });

      // Reconstrói a equipe a partir do órgão carregado.
      this.staff.clear();
      (this.agency.staff ?? []).forEach(member => this.staff.push(this.newStaff(member)));

      // Logotipo já cadastrado.
      this.logoUrl.set(this.agency.logo ?? '');
      this.logoName.set(this.agency.logo ? 'Logotipo atual' : '');
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

  /** CV-02: link público (auto-gerado) da página de Transparência deste órgão. */
  get transparencyLink(): string {
    return this.agency ? this.svc.buildTransparencyUrl(this.agency.id) : '';
  }

  /** 🌐 Portal da Transparência — abre a página pública do órgão (link auto-gerado, CV-02). */
  onTransparency(): void {
    if (this.agency) window.open(this.transparencyLink, '_blank');
  }

  /** Copia o link do Portal da Transparência do órgão para a área de transferência. */
  copyTransparencyLink(): void {
    const url = this.transparencyLink;
    if (!url) return;
    navigator.clipboard?.writeText(url);
    this.notify.success('Link do Portal da Transparência copiado.');
  }

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
    // permite atalhos (colar/copiar/recortar/selecionar) e edição/navegação
    if (event.ctrlKey || event.metaKey) return true;
    const nav = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (nav.includes(event.key)) return true;
    return /^\d$/.test(event.key);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

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

    const payload: AgencyUpdatePayload = {
      cnpj:          onlyDigits(raw.cnpj)  || undefined,
      legalName:     raw.legalName     || undefined,
      tradeName:     raw.tradeName     || undefined,
      emancipation:  raw.emancipation  || undefined,
      zipCode:       onlyDigits(raw.zipCode) || undefined,
      address:       raw.address       || undefined,
      number:        raw.number        || undefined,
      complement:    raw.complement    || undefined,
      managingOrgan:   raw.managingOrgan || undefined,
      phone:           onlyDigits(raw.phone) || undefined,
      email:           raw.email         || undefined,
      logo:            this.logoUrl()    || undefined,
      staff,
    };

    this.saved.emit(payload);
  }
}
