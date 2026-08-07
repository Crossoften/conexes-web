// src/app/features/employees/components/employee-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, NgIf, DecimalPipe, DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Employee, EmployeeUpdatePayload, EmployeeStatus, EmployeePayment, PositionOption, EMPLOYEE_STATUS_CONFIG, EMPLOYEE_STATUS_OPTIONS, VINCULO_OPTIONS } from '../employees.model';
import { EmployeesService } from '../employees.service';
import { environment } from '../../../../environments/environment';
import { maskMoney, formatDecimalBR, parseDecimalBR } from '../../../shared/utils/format';

type DetailTab = 'PARAMS' | 'BOLETO';

interface EntityItem   { id?: number; cnpj?: string; legalName: string; tradeName: string; }

@Component({
  selector: 'app-employee-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, DecimalPipe, DatePipe, ReactiveFormsModule],
  templateUrl: './employee-detail.modal.html',
  styleUrl: './employee-detail.modal.scss',
})
export class EmployeeDetailModalComponent implements OnChanges, OnInit {
  @Input() employee: Employee | null = null;
  @Input() loading = false;
  /** T1: quando 'edit', o modal abre já em edição (botão "Editar" da lista). */
  @Input() initialMode: 'view' | 'edit' = 'view';

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<EmployeeUpdatePayload>();

  private readonly fb   = inject(NonNullableFormBuilder);
  private readonly http = inject(HttpClient);
  private readonly svc  = inject(EmployeesService);

  protected mode:      'view' | 'edit' = 'view';
  protected activeTab: DetailTab       = 'PARAMS';

  readonly entities     = signal<EntityItem[]>([]);
  readonly positions    = signal<PositionOption[]>([]);
  readonly loadingLists = signal(false);

  readonly statusConfig  = EMPLOYEE_STATUS_CONFIG;
  readonly statusOptions = EMPLOYEE_STATUS_OPTIONS;
  readonly vinculoOptions = VINCULO_OPTIONS;

  /** Preserva um "Vínculo" legado (fora da lista fixa) para não perdê-lo ao editar. */
  get legacyVinculo(): string | null {
    const v = this.employee?.linkType ?? '';
    return v && !(VINCULO_OPTIONS as readonly string[]).includes(v) ? v : null;
  }

  // Pagamentos recebidos (GET /{id}/payments)
  readonly payments        = signal<EmployeePayment[]>([]);
  readonly paymentsLoading = signal(false);
  private  loadedPaymentsFor: number | null = null;

  protected readonly form = this.fb.group({
    entidade:           ['', Validators.required],
    nome:               ['', Validators.required],
    status:             ['Active'],
    tipoResponsavel:    ['', Validators.required],
    cargo:              ['', Validators.required],
    formacao:           ['', Validators.required],
    vinculo:            ['', Validators.required],
    cargaHorariaMensal: ['', Validators.required],
    dataAdmissao:       ['', Validators.required],
    dataDemissao:       [''],
    cns:                [''],   // opcional (7.5)
    salario:            ['', Validators.required],
    cpf:                ['', Validators.required],
    orgaoClasse:        [''],
    emailInstitucional: [''],
    emailPessoal:       [''],
    cep:                ['', Validators.required],
    endereco:           ['', Validators.required],
    nro:                ['', Validators.required],
    complemento:        [''],
    telefone:           ['', Validators.required],
    celular:            [''],
    parceria:           [''],
    origemRecurso:      [''],
    referencia:         [''],
    grossValue:         [''],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.mode = this.initialMode;

    // BK-1: cargos do catálogo real (GET /v1/positions). Sem fallback de ids fixos.
    this.svc.getPositions().subscribe({
      next: items => this.positions.set(items),
      error: ()    => this.positions.set([]),
    });

    this.loadingLists.set(true);
    this.http.get<EntityItem[]>(`${environment.apiUrl}/v1/institutional/entities`).subscribe({
      next: items => { this.entities.set(items); this.loadingLists.set(false); },
      error: ()   => this.loadingLists.set(false),
    });
  }

  ngOnChanges(): void {
    if (this.employee) {
      this.loadPayments(this.employee.id);
      this.form.patchValue({
        entidade:           String(this.employee.entityId ?? ''),
        nome:               this.employee.name               ?? '',
        status:             this.employee.status             ?? 'Active',
        tipoResponsavel:    this.employee.responsibleType    ?? '',
        cargo:              String(this.employee.positionId  ?? ''),
        formacao:           this.employee.formation          ?? '',
        vinculo:            this.employee.linkType           ?? '',
        cargaHorariaMensal: String(this.employee.workingHours ?? ''),
        // input type=date exige yyyy-MM-dd — fatiamos o ISO (senão o campo fica vazio,
        // invalida o form e a edição não salva os obrigatórios).
        dataAdmissao:       this.employee.startDate?.substring(0, 10) ?? '',
        dataDemissao:       this.employee.endDate?.substring(0, 10)   ?? '',
        cns:                this.employee.cns                ?? '',
        salario:            formatDecimalBR(this.employee.salary),
        cpf:                this.employee.cpf                ?? '',
        orgaoClasse:        this.employee.professionalBoard  ?? '',
        emailInstitucional: this.employee.institutionalEmail ?? '',
        emailPessoal:       this.employee.personalEmail      ?? '',
        cep:                this.employee.zipCode            ?? '',
        endereco:           this.employee.address            ?? '',
        nro:                this.employee.number             ?? '',
        complemento:        this.employee.complement         ?? '',
        telefone:           this.employee.phone              ?? '',
        celular:            this.employee.cellPhone          ?? '',
        parceria:           String(this.employee.partnershipId ?? ''),
        origemRecurso:      this.employee.resourceOrigin     ?? '',
        referencia:         this.employee.reference          ?? '',
        grossValue:         String(this.employee.grossValue  ?? ''),
      });
    }
  }

  // Carrega os pagamentos do colaborador uma vez por id (a listagem hidrata o modal
  // com getById, que dispara ngOnChanges várias vezes — evitamos recarregar à toa).
  private loadPayments(id: number): void {
    if (this.loadedPaymentsFor === id) return;
    this.loadedPaymentsFor = id;
    this.paymentsLoading.set(true);
    this.svc.getPayments(id).subscribe({
      next: list => { this.payments.set(list); this.paymentsLoading.set(false); },
      error: ()   => { this.payments.set([]); this.paymentsLoading.set(false); },
    });
  }

  // ── Helpers de view ───────────────────────────────────────────────────────

  get entityName(): string {
    if (!this.employee) return '—';
    const found = this.entities().find(e => e.id === this.employee!.entityId);
    return found ? (found.tradeName || found.legalName) : String(this.employee.entityId);
  }

  get positionName(): string {
    if (!this.employee) return '—';
    const found = this.positions().find(p => p.id === this.employee!.positionId);
    return found ? (found.title || found.name) : String(this.employee.positionId);
  }

  /** BK-1: nome do cargo escolhido no form (do catálogo) para espelhar em `title`. */
  private selectedPositionName(cargo: unknown): string {
    const found = this.positions().find(p => p.id === Number(cargo));
    return found ? (found.title || found.name) : '';
  }


  // ── Handlers ─────────────────────────────────────────────────────────────

  onClose(): void {
    this.mode      = 'view';
    this.activeTab = 'PARAMS';
    this.close.emit();
  }

  onEdit(): void {
    this.mode      = 'edit';
    this.activeTab = 'PARAMS';
  }

  onCancelEdit(): void {
    this.mode = 'view';
    if (this.employee) this.ngOnChanges();
  }

  onDelete(): void {
    if (this.employee) this.delete.emit(this.employee.id);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    // Datas: ISO 8601 completo quando há valor; null quando vazio (o back rejeita '').
    const toIso = (d: unknown): string | null => {
      const s = (d ?? '').toString().trim();
      return s ? new Date(s).toISOString() : null;
    };

    const payload: EmployeeUpdatePayload = {
      entityId:           (v.entidade && v.entidade !== 'undefined') ? Number(v.entidade) : 0,
      name:               v.nome               ?? '',
      cpf:                v.cpf                ?? '',
      email:              v.emailInstitucional  ?? '',
      phone:              v.telefone           ?? '',
      cellPhone:          v.celular            ?? '',
      status:             v.status as EmployeeStatus,
      // BK-1: `title` (rótulo do cargo na listagem) espelha o cargo escolhido no
      // catálogo; se não achar, mantém o valor legado para não perder dado.
      title:              this.selectedPositionName(v.cargo) || (this.employee?.title ?? ''),
      responsibleType:    v.tipoResponsavel    ?? '',
      positionId:         Number(v.cargo)      || 0,
      formation:          v.formacao           ?? '',
      linkType:           v.vinculo            ?? '',
      workingHours:       Number(v.cargaHorariaMensal) || 0,
      startDate:          toIso(v.dataAdmissao),
      endDate:            toIso(v.dataDemissao),
      cns:                v.cns                ?? '',
      salary:             parseDecimalBR(v.salario),
      professionalBoard:  v.orgaoClasse        ?? '',
      personalEmail:      v.emailPessoal       ?? '',
      institutionalEmail: v.emailInstitucional ?? '',
      zipCode:            v.cep                ?? '',
      address:            v.endereco           ?? '',
      number:             v.nro                ?? '',
      complement:         v.complemento        ?? '',
      partnershipId:      Number(v.parceria)   || 0,
      resourceOrigin:     v.origemRecurso      ?? '',
      reference:          v.referencia         ?? '',
      grossValue:         Number(v.grossValue) || 0,
    };

    this.saved.emit(payload);
  }

  // ── Máscaras ──────────────────────────────────────────────────────────────

  applyCpfMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = masked;
    this.form.get('cpf')?.setValue(masked, { emitEvent: false });
  }

  /** Máscara de moeda BR (sem símbolo) no salário; o submit converte via parseDecimalBR. */
  applyMoneyMask(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = maskMoney(input.value);
    this.form.get('salario')?.setValue(input.value, { emitEvent: false });
  }

  applyCepMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
    input.value  = masked;
    this.form.get('cep')?.setValue(masked, { emitEvent: false });
  }

  applyPhoneMask(event: Event, controlName: string): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.form.get(controlName)?.setValue(masked, { emitEvent: false });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }
}