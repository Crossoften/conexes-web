// src/app/features/employees/new/employee-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EmployeesService } from '../employees.service';
import { EmployeePayload, PositionOption, VINCULO_OPTIONS } from '../employees.model';
import { environment } from '../../../../environments/environment';
import { maskMoney, parseDecimalBR } from '../../../shared/utils/format';

type EmployeeTab = 'PARAMS' | 'BOLETO';

interface EntityItem   { id?: number; cnpj?: string; legalName: string; tradeName: string; }

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
  readonly positions    = signal<PositionOption[]>([]);
  readonly loadingLists = signal(true);
  readonly vinculoOptions = VINCULO_OPTIONS;

  activeTab: EmployeeTab = 'PARAMS';

  form: FormGroup = this.fb.group({
    entidade:           ['', Validators.required],
    nome:               ['', Validators.required],
    tipoResponsavel:    ['', Validators.required],
    cargo:              ['', Validators.required],
    formacao:           ['', Validators.required],
    vinculo:            ['', Validators.required],   // select fixo (VINCULO_OPTIONS)
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

  // B12: rótulo + aba de cada campo, para o banner de pendências e o foco no 1º inválido.
  private readonly fieldMeta: Record<string, { label: string; tab: EmployeeTab }> = {
    entidade:           { label: 'Entidade', tab: 'PARAMS' },
    nome:               { label: 'Nome completo', tab: 'PARAMS' },
    tipoResponsavel:    { label: 'Tipo responsável', tab: 'PARAMS' },
    cargo:              { label: 'Cargo', tab: 'PARAMS' },
    formacao:           { label: 'Formação', tab: 'PARAMS' },
    vinculo:            { label: 'Vínculo', tab: 'PARAMS' },
    cargaHorariaMensal: { label: 'Carga horária mensal', tab: 'PARAMS' },
    dataAdmissao:       { label: 'Data Admissão', tab: 'PARAMS' },
    dataDemissao:       { label: 'Data Demissão', tab: 'PARAMS' },
    cns:                { label: 'CNS', tab: 'PARAMS' },
    salario:            { label: 'Salário', tab: 'PARAMS' },
    cpf:                { label: 'CPF', tab: 'PARAMS' },
    orgaoClasse:        { label: 'Órgão de Classe', tab: 'PARAMS' },
    emailInstitucional: { label: 'E-mail Institucional', tab: 'PARAMS' },
    emailPessoal:       { label: 'E-mail Pessoal', tab: 'PARAMS' },
    cep:                { label: 'CEP', tab: 'PARAMS' },
    endereco:           { label: 'Endereço', tab: 'PARAMS' },
    nro:                { label: 'Número', tab: 'PARAMS' },
    complemento:        { label: 'Complemento', tab: 'PARAMS' },
    telefone:           { label: 'Telefone', tab: 'PARAMS' },
    celular:            { label: 'Celular', tab: 'PARAMS' },
    parceria:           { label: 'Parceria', tab: 'BOLETO' },
    origemRecurso:      { label: 'Origem do Recurso', tab: 'BOLETO' },
    referencia:         { label: 'Referência', tab: 'BOLETO' },
    grossValue:         { label: 'Valor Bruto', tab: 'BOLETO' },
  };

  private invalidControlNames(): string[] {
    return Object.keys(this.form.controls).filter(k => this.form.get(k)?.invalid);
  }

  /** Leva o usuário até o 1º campo inválido: abre a aba certa, rola e foca. */
  private goToInvalid(name: string): void {
    this.activeTab = this.fieldMeta[name]?.tab ?? 'PARAMS';
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[formcontrolname="${name}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    }, 60);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // BK-1: cargos vêm do catálogo real (GET /v1/positions). Sem fallback de ids
    // fixos — em erro fica vazio para nunca enviar um positionId inexistente.
    this.svc.getPositions().subscribe({
      next: items => this.positions.set(items),
      error: ()    => this.positions.set([]),
    });

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
    // permite atalhos (colar/copiar/recortar/selecionar) e edição/navegação
    if (event.ctrlKey || event.metaKey) return true;
    const nav = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (nav.includes(event.key)) return true;
    return /^\d$/.test(event.key);
  }

  /** BK-1: nome do cargo selecionado (do catálogo) para espelhar em `title`. */
  private positionName(cargo: unknown): string {
    const found = this.positions().find(p => p.id === Number(cargo));
    return found ? (found.title || found.name) : '';
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
      const invalid = this.invalidControlNames();
      const labels = invalid.map(n => this.fieldMeta[n]?.label ?? n);
      const shown = labels.slice(0, 6).join(', ') + (labels.length > 6 ? '…' : '');
      this.errorMsg.set(`Há ${invalid.length} campo(s) obrigatório(s) pendente(s): ${shown}.`);
      if (invalid.length) this.goToInvalid(invalid[0]);
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
      // BK-1: `title` (rótulo do cargo, exibido na listagem) espelha o nome do
      // cargo escolhido no catálogo `/v1/positions`.
      title:              this.positionName(v.cargo),
      responsibleType:    v.tipoResponsavel            ?? '',
      positionId:         Number(v.cargo)              || 0,
      formation:          v.formacao                   ?? '',
      linkType:           v.vinculo                    ?? '',
      workingHours:       Number(v.cargaHorariaMensal) || 0,
      startDate:          toIso(v.dataAdmissao),
      endDate:            toIso(v.dataDemissao),
      cns:                v.cns                        ?? '',
      salary:             String(v.salario ?? '').trim() ? parseDecimalBR(v.salario) : undefined,  // VG-05
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
