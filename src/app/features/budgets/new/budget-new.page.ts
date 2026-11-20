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
  // Card #720 (FN-07): /v1/projects devolve centros de custo E projetos, de tabelas diferentes
  // (ids podem coincidir). O valor da opção leva o tipo — "cc:22" / "pr:18" — e o envio separa
  // costCenterId de projectId; antes o centro de custo ia como projectId e a API dava 400.
  // Card #768 (item 64): centro de custo, projeto e atividade em campos próprios.
  centros: { id: string; nome: string }[] = [];
  projetos: { id: string; nome: string }[] = [];
  atividades: { id: string; nome: string }[] = [];
  readonly formasAcompanhamento = [
    { ctrl: 'acompCategoria', rotulo: 'Categoria' },
    { ctrl: 'acompCentro', rotulo: 'Centro de custo' },
    { ctrl: 'acompProjeto', rotulo: 'Projeto' },
    { ctrl: 'acompAtividade', rotulo: 'Atividade' },
  ];
  readonly errorMsg = signal<string | null>(null);
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

      // Card #768 (item 64): classificação padrão aplicada às rubricas que não especificarem
      categoriaPadrao: [''],
      centroPadrao: [''],
      projetoPadrao: [''],
      atividadePadrao: [''],

      // Formas de acompanhamento
      acompCategoria: [false],
      acompCentro: [false],
      acompProjeto: [false],
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
      categoria: [''],
      centro: [''],
      projeto: [''],
      atividade: [''],
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
    // Card #768 (item 64): centro de custo, projeto e atividade, cada um no seu campo.
    this.http.get<any>(`${environment.apiUrl}/v1/projects?take=1000`).subscribe({
      next: (res) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const nome = (p: any) => `${p.code ? p.code + ' — ' : ''}${p.name ?? p.title ?? `#${p.id}`}`;
        // CC-01: só as analíticas recebem lançamento (o back recusa a sintética com 400).
        const analitica = (p: any) => p.classification !== 'Sintetica';
        this.centros = list.filter(p => p._entityType === 'cost_center' && analitica(p)).map(p => ({ id: String(p.id), nome: nome(p) }));
        this.projetos = list.filter(p => p._entityType === 'project' && analitica(p)).map(p => ({ id: String(p.id), nome: nome(p) }));
        this.atividades = list.filter(p => p._entityType === 'activity' && analitica(p)).map(p => ({ id: String(p.id), nome: nome(p) }));
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
      acompCentro: false,
      acompProjeto: false,
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

    // Card #768 (item 64): cada rubrica leva Categoria, Centro de custo, Projeto e
    // Atividade; em branco, vale a classificação padrão.
    const items = this.itens.controls.map((c) => {
      const iv = c.value;
      const item: any = { amount: Number(iv.valor) || 0 };
      const num = (x: any) => (x ? Number(x) : undefined);
      const categoria = num(iv.categoria || v.categoriaPadrao);
      const centro = num(iv.centro || v.centroPadrao);
      const projeto = num(iv.projeto || v.projetoPadrao);
      const atividade = num(iv.atividade || v.atividadePadrao);
      if (categoria) item.accountPlanId = categoria;
      if (centro) item.costCenterId = centro;
      if (projeto) item.projectId = projeto;
      if (atividade) {
        item.subProjectId = atividade;
        item.activity = this.atividades.find(a => Number(a.id) === atividade)?.nome;
      }
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

  /** Card #720 (FN-07): o motivo fica escrito na tela (o toast some em 4 s). */
  private falhar(msg: string): void {
    this.errorMsg.set(msg);
    this.notify.error(msg);
  }

  onSubmit() {
    this.errorMsg.set(null);
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      const semValor = this.itens.controls
        .map((c, i) => (c.get('valor')?.invalid ? i + 1 : 0))
        .filter(Boolean);
      const cabecalhoOk = Object.keys(this.form.controls)
        .filter(k => k !== 'itens')
        .every(k => this.form.get(k)?.valid);
      this.falhar(
        cabecalhoOk && semValor.length
          ? `Rubrica ${semValor.join(', ')} sem valor: informe o valor ou clique em "Remover".`
          : 'Preencha os campos obrigatórios destacados (título, periodicidade, tipo, período) e ao menos uma rubrica com valor.',
      );
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
        this.falhar(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Erro ao salvar o orçamento.'));
      },
    });
  }
}
