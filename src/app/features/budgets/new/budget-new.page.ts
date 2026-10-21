// src/app/features/budgets/new/budget-new.page.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BudgetsService } from '../budgets.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';

// Conta do plano de contas (árvore N níveis), como nos demais cadastros.
interface AccountPlanOption { id: number; code: string; title: string; accountType?: string | null; children?: AccountPlanOption[]; }

/** Achata a árvore do plano de contas mantendo só as contas analíticas (as que recebem lançamento). */
function flattenAnalytic(nodes: AccountPlanOption[]): AccountPlanOption[] {
  const out: AccountPlanOption[] = [];
  const walk = (list: AccountPlanOption[]) => {
    for (const n of list) {
      if (n.accountType === 'Analitica') out.push({ id: n.id, code: n.code, title: n.title, accountType: n.accountType });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes ?? []);
  return out;
}

@Component({
  selector: 'app-budget-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass, CurrencyMaskDirective],
  templateUrl: './budget-new.page.html',
  styleUrl: './budget-new.page.scss',
})
export class BudgetNewPage implements OnInit {
  form: FormGroup;
  private http = inject(HttpClient);
  private budgets = inject(BudgetsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  readonly saving = signal(false);

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
  // OR-01: contas analíticas do plano de contas, para as rubricas do orçamento.
  contas: AccountPlanOption[] = [];

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

      // Projeto/Centro de custo (padrão aplicado às rubricas que não especificarem)
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
      gruposPermissoes: [''],

      // OR-01: rubricas do orçamento (o back exige ao menos uma)
      itens: this.fb.array([]),
    });
    this.addItem();
  }

  get itens(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  private newItem(): FormGroup {
    return this.fb.group({
      contaPlano: [''],
      projetoItem: [''],
      valor: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  addItem(): void {
    this.itens.push(this.newItem());
  }

  removeItem(i: number): void {
    if (this.itens.length > 1) this.itens.removeAt(i);
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

    // OR-01: contas analíticas do plano de contas para as rubricas.
    this.http.get<AccountPlanOption[]>(`${environment.apiUrl}/v1/account-plan/tree`).subscribe({
      next: (res) => { this.contas = flattenAnalytic(res ?? []); },
      error: () => {},
    });
  }

  resetForm() {
    this.form.reset({
      acompCategoria: false,
      acompProjeto: false,
      acompSubprojeto: false,
      acompAtividade: false,
      restringirMovimentacoes: false,
    });
    this.itens.clear();
    this.addItem();
  }

  private pad(n: number): string { return String(n).padStart(2, '0'); }

  private buildPayload() {
    const v = this.form.value;
    const anoI = Number(v.anoInicio), mesI = Number(v.mesInicio);
    const anoF = Number(v.anoFim), mesF = Number(v.mesFim);
    const lastDay = new Date(anoF, mesF, 0).getDate(); // último dia do mês fim

    const items = this.itens.controls.map((c) => {
      const iv = c.value;
      const item: any = { amount: Number(iv.valor) || 0 };
      const conta = Number(iv.contaPlano);
      if (conta) item.accountPlanId = conta;
      const proj = Number(iv.projetoItem || v.projetoCentroCusto);
      if (proj) item.projectId = proj;
      const sub = Number(v.subprojeto);
      if (sub) item.subProjectId = sub;
      const atv = this.atividades.find((a) => String(a.id) === String(v.atividade));
      if (atv) item.activity = atv.nome;
      return item;
    });

    return {
      title: v.titulo,
      description: v.descricao || undefined,
      exercise: anoI,
      periodicity: v.periodicidade || undefined,
      launchType: v.tipoLancamento || undefined,
      periodStart: `${anoI}-${this.pad(mesI)}-01`,
      periodEnd: `${anoF}-${this.pad(mesF)}-${this.pad(lastDay)}`,
      restrictMovements: !!v.restringirMovimentacoes,
      items,
    };
  }

  onSubmit() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios e ao menos uma rubrica com valor.');
      return;
    }
    this.saving.set(true);
    this.budgets.create(this.buildPayload()).subscribe({
      next: () => {
        this.notify.success('Orçamento salvo com sucesso.');
        this.router.navigate(['/budgets']);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message;
        this.notify.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao salvar o orçamento.'));
      },
    });
  }
}
