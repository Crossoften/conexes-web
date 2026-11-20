// src/app/features/cost-centers/new/cost-centers-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { CostCentersService } from '../cost-centers.service';
import { CostCenterPayload, LinkedAccount, ENTITY_KINDS } from '../cost-centers.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PopupShellComponent } from '../../../shared/components/popup-shell/popup-shell.component';
import { BankAccountNewPage } from '../../bank-accounts/new/bank-account-new.page';

interface AccountPlanItem {
  id:    number;
  code:  string;
  title: string;
}

interface EntityItem {
  id:        number;
  legalName: string;
  tradeName: string;
}

@Component({
  selector: 'app-cost-centers-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, FormsModule, NgClass, PopupShellComponent, BankAccountNewPage],
  templateUrl: './cost-centers-new.page.html',
  styleUrl: './cost-centers-new.page.scss',
})
export class CostCentersNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private svc    = inject(CostCentersService);
  private http   = inject(HttpClient);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly accountPlans = signal<AccountPlanItem[]>([]);
  readonly projects     = signal<{ id: number; name: string }[]>([]);   // CC-03: projetos p/ escolher o pai de uma Atividade avulsa
  /** Card #768: centros de custo para o campo "Centro de custo superior". */
  readonly costCenters  = signal<{ id: number; code: string; name: string; classification: string }[]>([]);
  /** Card #768 (item 7): cadastro de conta bancária em pop-up, sem sair do formulário. */
  readonly showBankPopup = signal(false);
  /** Card #768 (itens 3 e 5): tipos permitidos no subnível, conforme o pai. */
  readonly allowedTypes = signal<string[]>(['centro_de_custo', 'projeto', 'atividade']);
  readonly bankAccounts = signal<any[]>([]);                            // CC-04: contas bancárias p/ a composição vinculada
  readonly entities     = signal<EntityItem[]>([]);
  readonly loadingLists = signal(true);

  // Preenchido quando a tela é aberta via "Adicionar Subnível" a partir de um pai.
  readonly parentName = signal<string | null>(null);
  // CC-03 fix: o pai veio pronto da query string ("Adicionar Subnível") — nesse caso
  // o select de "Projeto pai" nem aparece. Antes a condição do template olhava o
  // VALOR do campo, então escolher um projeto fazia o próprio campo sumir.
  readonly parentLocked = signal(false);

  // Contas vinculadas gerenciadas separadamente (array dinâmico)
  linkedAccounts: LinkedAccount[] = [];
  selectedLinkedAccount = '';
  selectedLinkedOrigin  = 'Caixa';

  form: FormGroup = this.fb.group({
    projectType:         ['', Validators.required],
    classification:      ['Analitica', Validators.required],
    projectCode:         ['', [Validators.required, Validators.pattern(/^[0-9.]+$/)]],
    projectTitle:        ['', Validators.required],
    accountingCode:      [''],
    payingSource:        [''],
    startDate:           [''],
    categoryDescription: [''],
    restrictInterest:    [false],
    budgetRestriction:   [false],
    costCenterId:        [null],
    parentProjectId:     [null],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // "Adicionar Subnível": abre já vinculado a um pai (ex.: projeto dentro de um CC).
    const qp       = this.route.snapshot.queryParamMap;
    const parentId        = qp.get('parentId');
    const parentProjectId = qp.get('parentProjectId');
    if (parentProjectId) {
      // Subnível Atividade: vinculado ao Projeto pai via parentProjectId.
      this.form.patchValue({
        projectType:     qp.get('type') ?? 'atividade',
        parentProjectId: Number(parentProjectId),
      });
      this.parentName.set(qp.get('parentName'));
      this.parentLocked.set(true);
      this.allowedTypes.set(['atividade']);
    } else if (parentId) {
      // Card #768 (itens 3 e 5): subnível de um Centro de Custo pode ser outro
      // Centro de Custo (quando o pai é sintético) ou um Projeto. O pai segue em
      // `costCenterId` — o back usa como superior do centro de custo ou do projeto.
      const parentSint = qp.get('parentClassification') === 'Sintetica';
      this.allowedTypes.set(parentSint ? ['centro_de_custo', 'projeto'] : ['projeto']);
      this.form.patchValue({
        projectType:  qp.get('type') ?? (parentSint ? 'centro_de_custo' : 'projeto'),
        costCenterId: Number(parentId),
      });
      this.parentName.set(qp.get('parentName'));
      this.parentLocked.set(true);
    }
    // Sugere o número do subnível a partir do número do pai (ex.: 01.01 → 01.01.).
    const parentCode = qp.get('parentCode');
    if (parentCode && !this.form.get('projectCode')?.value) this.form.patchValue({ projectCode: `${parentCode}.` });

    // CC-03: Atividade avulsa exige o Projeto pai; nos demais tipos o campo nem existe.
    this.form.get('projectType')?.valueChanges.subscribe(() => this.syncParentValidator());
    this.syncParentValidator();

    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) this.loadingLists.set(false); };

    // Ambos os endpoints devolvem o envelope { data, count, pages } — lemos `data`
    // de forma tolerante. `take` alto no account-plan para trazer todas as contas
    // (senão o dropdown fica limitado à 1ª página).
    this.http.get<AccountPlanItem[] | { data?: AccountPlanItem[] }>(
      `${environment.apiUrl}/v1/account-plan`, { params: { take: '1000' } },
    ).subscribe({
      next: res => { this.accountPlans.set(Array.isArray(res) ? res : res?.data ?? []); checkDone(); },
      error: () => checkDone(),
    });

    this.http.get<EntityItem[] | { data?: EntityItem[] }>(
      `${environment.apiUrl}/v1/institutional/entities`, { params: { take: '1000' } },
    ).subscribe({
      next: res => { this.entities.set(Array.isArray(res) ? res : res?.data ?? []); checkDone(); },
      error: () => checkDone(),
    });

    // CC-03: projetos disponíveis como pai ao cadastrar uma Atividade avulsa (não gateia loadingLists).
    this.http.get<any[] | { data?: any[] }>(
      `${environment.apiUrl}/v1/projects`, { params: { type: 'projeto', take: '500' } },
    ).subscribe({
      next: res => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.projects.set(list.map((p: any) => ({ id: Number(p.id), name: p.title ?? p.name ?? String(p.id) })));
      },
      error: () => {},
    });

    // CC-04: contas bancárias para a composição de contas vinculadas.
    this.loadBankAccounts();

    // Card #768: centros de custo para o "Centro de custo superior" (cadastro avulso).
    this.http.get<any[] | { data?: any[] }>(
      `${environment.apiUrl}/v1/projects`, { params: { type: 'centro_de_custo', take: '1000' } },
    ).subscribe({
      next: res => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.costCenters.set(list.map((c: any) => ({ id: Number(c.id), code: c.code, name: c.name ?? c.title, classification: c.classification })));
      },
      error: () => {},
    });
  }

  private loadBankAccounts(selectId?: number): void {
    this.http.get<any[] | { data?: any[] }>(
      `${environment.apiUrl}/v1/institutional/bank-accounts`, { params: { take: '500' } },
    ).subscribe({
      next: res => {
        this.bankAccounts.set(Array.isArray(res) ? res : res?.data ?? []);
        if (selectId) this.selectedLinkedAccount = String(selectId);
      },
      error: () => {},
    });
  }

  /** Superior possível para o tipo escolhido: CC → só sintéticos; Projeto → qualquer CC. */
  parentOptions() {
    const t = this.form.get('projectType')?.value;
    return t === 'centro_de_custo' ? this.costCenters().filter(c => c.classification === 'Sintetica') : this.costCenters();
  }

  /** CC-03: "Projeto pai" só é obrigatório na Atividade avulsa (sem pai na query string). */
  private syncParentValidator(): void {
    const ctrl = this.form.get('parentProjectId');
    if (!ctrl) return;
    const required = this.form.get('projectType')?.value === 'atividade' && !this.parentLocked();
    required ? ctrl.setValidators([Validators.required]) : ctrl.clearValidators();
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  // ── Contas vinculadas ─────────────────────────────────────────────────────

  /** Código define a hierarquia (1, 1.1, 1.2) → só dígitos e ponto. */
  onCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const cleaned = el.value.replace(/[^0-9.]/g, '');
    el.value = cleaned;
    this.form.get('projectCode')?.setValue(cleaned, { emitEvent: false });
  }

  addLinkedAccount(): void {
    if (!this.selectedLinkedAccount) return;
    const id = Number(this.selectedLinkedAccount);
    if (this.linkedAccounts.some(a => a.bankAccountId === id)) return;
    this.linkedAccounts = [
      ...this.linkedAccounts,
      { origin: this.selectedLinkedOrigin, bankAccountId: id },
    ];
    this.selectedLinkedAccount = '';
  }

  /**
   * Card #768 (item 7): o "+" abre o cadastro de Contas Bancárias em pop-up, por
   * cima do formulário. Ao salvar, a lista é recarregada e a conta nova já fica
   * selecionada — sem sair do cadastro do centro de custo nem atualizar a página.
   */
  openBankAccountRegister(): void { this.showBankPopup.set(true); }
  closeBankPopup(): void { this.showBankPopup.set(false); }
  onBankAccountCreated(acc: any): void {
    this.showBankPopup.set(false);
    this.loadBankAccounts(acc?.id);
  }

  removeLinkedAccount(index: number): void {
    this.linkedAccounts = this.linkedAccounts.filter((_, i) => i !== index);
  }

  getAccountLabel(id: number | undefined): string {
    if (id == null) return '—';
    const a = this.bankAccounts().find((p: any) => p.id === id);
    if (!a) return String(id);
    const nome  = a.nickname ?? a.apelido ?? a.bankName ?? a.bank?.name ?? a.name ?? 'Conta';
    const conta = [a.agency ?? a.agencia, a.accountNumber ?? a.conta ?? a.number].filter(Boolean).join(' / ');
    return conta ? `${nome} — ${conta}` : String(nome);
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset({ restrictInterest: false, budgetRestriction: false });
    this.linkedAccounts        = [];
    this.selectedLinkedAccount = '';
    this.errorMsg.set(null);
  }

  /** Card #768 (item 8): o Salvar nunca fica mudo — diz o que falta, perto do botão. */
  private readonly labels: Record<string, string> = {
    projectType: 'Tipo', classification: 'Classificação contábil', projectCode: 'Código', projectTitle: 'Título', parentProjectId: 'Projeto pai',
  };

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const faltam = Object.keys(this.labels).filter(k => this.form.get(k)?.invalid).map(k =>
        k === 'projectCode' && this.form.get(k)?.hasError('pattern') ? 'Código (só números e pontos)' : this.labels[k]);
      this.errorMsg.set(`Preencha os campos obrigatórios: ${faltam.join(', ')}.`);
      return;
    }
    if (this.selectedLinkedAccount) {
      // Conta escolhida mas não confirmada no ✓: entra na composição ao salvar.
      this.addLinkedAccount();
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: CostCenterPayload = {
      code:                v.projectCode         ?? '',
      name:                v.projectTitle        ?? '',
      type:                v.projectType         ?? '',
      // entityKind canônico substitui a detecção frágil por texto em `type`.
      entityKind:          ENTITY_KINDS.includes(v.projectType) ? v.projectType : undefined,
      classification:      v.classification === 'Sintetica' ? 'Sintetica' : 'Analitica',
      description:         v.categoryDescription ?? '',
      status:              'Active',
      accountingCode:      v.accountingCode      ?? '',
      payingSource:        (v.payingSource && v.payingSource !== 'undefined') ? String(v.payingSource) : '',
      startDate:           v.startDate ? new Date(v.startDate).toISOString() : null,
      categoryDescription: v.categoryDescription  ?? '',
      restrictInterestFine: !!v.restrictInterest,
      restrictBudget:       !!v.budgetRestriction,
      costCenterId:         v.costCenterId ? Number(v.costCenterId) : null,
      parentProjectId:      v.parentProjectId ? Number(v.parentProjectId) : null,
      linkedAccounts:       this.linkedAccounts,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/cost-centers']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}