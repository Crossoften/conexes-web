// src/app/features/budgets/new/budget-new.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-budget-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './budget-new.page.html',
  styleUrl: './budget-new.page.scss',
})
export class BudgetNewPage implements OnInit {
  form: FormGroup;
  private http = inject(HttpClient);

  // FA-10: listas estáticas (não dependem de nenhum cadastro).
  readonly meses = [
    { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' }, { v: 4, l: 'Abril' },
    { v: 5, l: 'Maio' }, { v: 6, l: 'Junho' }, { v: 7, l: 'Julho' }, { v: 8, l: 'Agosto' },
    { v: 9, l: 'Setembro' }, { v: 10, l: 'Outubro' }, { v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' },
  ];
  readonly anos: number[] = (() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => base - 1 + i);
  })();
  readonly periodicidades = ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];
  readonly tiposLancamento = ['Receita', 'Despesa'];

  // FA-10: Projeto/CC e Atividade carregados do cadastro (GET /v1/projects).
  projetos: { id: number; nome: string }[] = [];
  atividades: { id: number; nome: string }[] = [];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // Informações básicas
      titulo: ['', Validators.required],
      periodicidade: ['', Validators.required],
      tipoLancamento: ['', Validators.required],
      descricao: [''],

      // Período
      mesInicio: ['', Validators.required],
      anoInicio: ['', Validators.required],
      mesFim: ['', Validators.required],
      anoFim: ['', Validators.required],

      // Projeto/Centro de custo
      projetoCentroCusto: [''],
      subprojeto: [''],
      atividade: [''],

      // Formas de acompanhamento
      acompCategoria: [false],
      acompProjeto: [false],
      acompSubprojeto: [false],
      acompAtividade: [false],

      // Restringir movimentações
      restringirMovimentacoes: [false],

      // Ocultar orçamento
      usuarios: [''],
      gruposPermissoes: ['']
    });
  }

  ngOnInit(): void {
    // FA-10: carrega Projeto/Centro de Custo e Atividade do cadastro existente.
    this.http.get<any>(`${environment.apiUrl}/v1/projects?take=1000`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const nome = (p: any) => p.name ?? p.title ?? `#${p.id}`;
        this.projetos = list
          .filter((p) => p.type !== 'atividade')
          .map((p) => ({ id: p.id, nome: nome(p) }));
        this.atividades = list
          .filter((p) => p.type === 'atividade')
          .map((p) => ({ id: p.id, nome: nome(p) }));
      },
      error: () => {},
    });
  }

  resetForm() {
    this.form.reset({
      acompCategoria: false,
      acompProjeto: false,
      acompSubprojeto: false,
      acompAtividade: false,
      restringirMovimentacoes: false
    });
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Form data:', this.form.value);
      // Lógica de salvamento
    } else {
      this.form.markAllAsTouched();
    }
  }
}