// src/app/features/employees/components/employee-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, inject, signal } from '@angular/core';
import { NgClass, NgIf, DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Employee, EmployeeUpdatePayload } from '../employees.model';
import { environment } from '../../../../environments/environment';

type DetailTab = 'PARAMS' | 'BOLETO';

interface EntityItem   { id?: number; cnpj?: string; legalName: string; tradeName: string; }
interface PositionItem { id: number; name: string; title?: string; }

@Component({
  selector: 'app-employee-detail-modal',
  standalone: true,
  imports: [NgClass, NgIf, DecimalPipe, ReactiveFormsModule],
  templateUrl: './employee-detail.modal.html',
  styleUrl: './employee-detail.modal.scss',
})
export class EmployeeDetailModalComponent implements OnChanges, OnInit {
  @Input() employee: Employee | null = null;
  @Input() loading = false;

  @Output() close  = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() saved  = new EventEmitter<EmployeeUpdatePayload>();

  private readonly fb   = inject(NonNullableFormBuilder);
  private readonly http = inject(HttpClient);

  protected mode:      'view' | 'edit' = 'view';
  protected activeTab: DetailTab       = 'PARAMS';

  readonly entities     = signal<EntityItem[]>([]);
  readonly positions    = signal<PositionItem[]>([]);
  readonly loadingLists = signal(false);

  private readonly POSITIONS_FALLBACK: PositionItem[] = [
    { id: 1,  name: 'Diretor Executivo'          },
    { id: 2,  name: 'Diretor Financeiro'          },
    { id: 3,  name: 'Diretor Administrativo'      },
    { id: 4,  name: 'Coordenador de Projetos'     },
    { id: 5,  name: 'Coordenador Financeiro'      },
    { id: 6,  name: 'Analista Financeiro'         },
    { id: 7,  name: 'Analista de Projetos'        },
    { id: 8,  name: 'Assistente Administrativo'   },
    { id: 9,  name: 'Assistente Financeiro'       },
    { id: 10, name: 'Técnico de Contabilidade'    },
    { id: 11, name: 'Contador'                    },
    { id: 12, name: 'Advogado'                    },
    { id: 13, name: 'Educador Social'             },
    { id: 14, name: 'Psicólogo'                   },
    { id: 15, name: 'Assistente Social'           },
    { id: 16, name: 'Enfermeiro'                  },
    { id: 17, name: 'Médico'                      },
    { id: 18, name: 'Auxiliar de Serviços Gerais' },
    { id: 19, name: 'Motorista'                   },
    { id: 20, name: 'Outros'                      },
  ];

  protected readonly form = this.fb.group({
    entidade:           ['', Validators.required],
    nome:               ['', Validators.required],
    tipoResponsavel:    ['', Validators.required],
    cargo:              ['', Validators.required],
    formacao:           ['', Validators.required],
    vinculo:            ['', Validators.required],
    cargaHorariaMensal: ['', Validators.required],
    dataAdmissao:       ['', Validators.required],
    dataDemissao:       [''],
    cns:                ['', Validators.required],
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
    this.positions.set(this.POSITIONS_FALLBACK);

    this.http.get<PositionItem[]>(`${environment.apiUrl}/v1/positions`).subscribe({
      next: items => { if (items?.length > 0) this.positions.set(items); },
    });

    this.loadingLists.set(true);
    this.http.get<EntityItem[]>(`${environment.apiUrl}/v1/institutional/entities`).subscribe({
      next: items => { this.entities.set(items); this.loadingLists.set(false); },
      error: ()   => this.loadingLists.set(false),
    });
  }

  ngOnChanges(): void {
    if (this.employee) {
      this.form.patchValue({
        entidade:           String(this.employee.entityId ?? ''),
        nome:               this.employee.name               ?? '',
        tipoResponsavel:    this.employee.responsibleType    ?? '',
        cargo:              String(this.employee.positionId  ?? ''),
        formacao:           this.employee.formation          ?? '',
        vinculo:            this.employee.linkType           ?? '',
        cargaHorariaMensal: String(this.employee.workingHours ?? ''),
        dataAdmissao:       this.employee.startDate          ?? '',
        dataDemissao:       this.employee.endDate            ?? '',
        cns:                this.employee.cns                ?? '',
        salario:            String(this.employee.salary      ?? ''),
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

  get statusVariant(): string {
    if (!this.employee?.status) return 'neutral';
    return this.employee.status === 'Active' ? 'success' : 'danger';
  }

  get statusLabel(): string {
    if (!this.employee?.status) return '—';
    return this.employee.status === 'Active' ? 'Ativo' : 'Inativo';
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

    const payload: EmployeeUpdatePayload = {
      entityId:           (v.entidade && v.entidade !== 'undefined') ? Number(v.entidade) : 0,
      name:               v.nome               ?? '',
      cpf:                v.cpf                ?? '',
      email:              v.emailInstitucional  ?? '',
      phone:              v.telefone           ?? '',
      cellPhone:          v.celular            ?? '',
      title:              v.tipoResponsavel    ?? '',
      responsibleType:    v.tipoResponsavel    ?? '',
      positionId:         Number(v.cargo)      || 0,
      formation:          v.formacao           ?? '',
      linkType:           v.vinculo            ?? '',
      workingHours:       Number(v.cargaHorariaMensal) || 0,
      startDate:          v.dataAdmissao       ?? '',
      endDate:            v.dataDemissao       ?? '',
      cns:                v.cns                ?? '',
      salary:             Number(v.salario)    || 0,
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