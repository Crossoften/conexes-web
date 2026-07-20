// src/app/features/employees/new/employee-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EmployeesService } from '../employees.service';
import { EmployeePayload } from '../employees.model';
import { environment } from '../../../../environments/environment';

type EmployeeTab = 'PARAMS' | 'BOLETO';

interface EntityItem   { id?: number; cnpj?: string; legalName: string; tradeName: string; }
interface PositionItem { id: number; name: string; title?: string; }

@Component({
  selector: 'app-employee-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './employee-new.page.html',
  styleUrl: './employee-new.page.scss',
})
export class EmployeeNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(EmployeesService);
  private http   = inject(HttpClient);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly entities     = signal<EntityItem[]>([]);
  readonly positions    = signal<PositionItem[]>([]);
  readonly loadingLists = signal(true);

  activeTab: EmployeeTab = 'PARAMS';

  // Lista temporária — substituir quando GET /v1/positions estiver disponível
  private readonly POSITIONS_FALLBACK: PositionItem[] = [
    { id: 1,  name: 'Diretor Executivo'           },
    { id: 2,  name: 'Diretor Financeiro'           },
    { id: 3,  name: 'Diretor Administrativo'       },
    { id: 4,  name: 'Coordenador de Projetos'      },
    { id: 5,  name: 'Coordenador Financeiro'       },
    { id: 6,  name: 'Analista Financeiro'          },
    { id: 7,  name: 'Analista de Projetos'         },
    { id: 8,  name: 'Assistente Administrativo'    },
    { id: 9,  name: 'Assistente Financeiro'        },
    { id: 10, name: 'Técnico de Contabilidade'     },
    { id: 11, name: 'Contador'                     },
    { id: 12, name: 'Advogado'                     },
    { id: 13, name: 'Educador Social'              },
    { id: 14, name: 'Psicólogo'                    },
    { id: 15, name: 'Assistente Social'            },
    { id: 16, name: 'Enfermeiro'                   },
    { id: 17, name: 'Médico'                       },
    { id: 18, name: 'Auxiliar de Serviços Gerais'  },
    { id: 19, name: 'Motorista'                    },
    { id: 20, name: 'Outros'                       },
  ];

  form: FormGroup = this.fb.group({
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
    // Cargos: lista fixa por ora. O endpoint GET /v1/positions ainda não existe (B-CO-02) —
    // chamá-lo retornava 404. Religar quando o Back expuser o catálogo de cargos (F-CO-03).
    this.positions.set(this.POSITIONS_FALLBACK);

    // Entidades: carrega do back
    this.http.get<EntityItem[]>(`${environment.apiUrl}/v1/institutional/entities`).subscribe({
      next: items => { this.entities.set(items); this.loadingLists.set(false); },
      error: () => this.loadingLists.set(false),
    });
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
    input.value = masked;
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

  // ── Handlers ─────────────────────────────────────────────────────────────

  setTab(tab: EmployeeTab): void { this.activeTab = tab; }

  resetForm(): void {
    this.form.reset();
    this.activeTab = 'PARAMS';
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;
    // Datas: ISO 8601 completo quando há valor; null quando vazio (o back rejeita '').
    const toIso = (d: unknown): string | null => {
      const s = (d ?? '').toString().trim();
      return s ? new Date(s).toISOString() : null;
    };

    const payload: EmployeePayload = {
      entityId:           (v.entidade && v.entidade !== 'undefined') ? Number(v.entidade) : 0,
      name:               v.nome ?? '',
      cpf:                v.cpf                        ?? '',
      email:              v.emailInstitucional          ?? '',
      phone:              v.telefone                   ?? '',
      cellPhone:          v.celular                    ?? '',
      status:             'Active',
      // `title` (cargo/título) não tem campo próprio no formulário e NÃO deve receber o
      // tipo (Colaborador/Dirigente) — enviado vazio até definir a fonte (B-CO-07).
      title:              '',
      responsibleType:    v.tipoResponsavel            ?? '',
      positionId:         Number(v.cargo)              || 0,
      formation:          v.formacao                   ?? '',
      linkType:           v.vinculo                    ?? '',
      workingHours:       Number(v.cargaHorariaMensal) || 0,
      startDate:          toIso(v.dataAdmissao),
      endDate:            toIso(v.dataDemissao),
      cns:                v.cns                        ?? '',
      salary:             Number(v.salario)            || 0,
      professionalBoard:  v.orgaoClasse                ?? '',
      personalEmail:      v.emailPessoal               ?? '',
      institutionalEmail: v.emailInstitucional         ?? '',
      zipCode:            v.cep                        ?? '',
      address:            v.endereco                   ?? '',
      number:             v.nro                        ?? '',
      complement:         v.complemento                ?? '',
      partnershipId:      Number(v.parceria)           || 0,
      resourceOrigin:     v.origemRecurso              ?? '',
      reference:          v.referencia                 ?? '',
      grossValue:         Number(v.grossValue)         || 0,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/employees']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
