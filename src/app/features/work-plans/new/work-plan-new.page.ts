// src/app/features/work-plans/new/work-plan-new.page.ts
//
// Builder do "Novo Plano de Trabalho": paleta/índice à esquerda, canvas à direita.
// Bloco-cabeçalho fixo (Título / Órgão / Instrumento) + blocos adicionáveis,
// removíveis e reordenáveis (drag nativo). Batch 4a: blocos institucionais + dados
// do plano. Metas/Financeiro/Monitoramento/Blocos Livres + Preview/PDF nos próximos.

import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { WorkPlansService } from '../work-plans.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  WorkPlanRef,
  WorkPlanGoalPayload,
  CreateWorkPlanPayload,
} from '../work-plans.model';
import {
  BLOCK_GROUPS,
  BlockDef,
  BlockInstance,
  BlockType,
} from './work-plan-blocks.model';

/** String monetária/numérica (pt-BR) → number; vazio → undefined. */
function toNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

interface StepRow { step: string; place: string; period: string; startDate: string; endDate: string; }
interface AppItemRow {
  linkedGoal: string; linkedStep: string; expenseItem: string; inKindPayment: string;
  expenseType: string; unit: string; quantity: string; unitValue: string; totalValue: string;
}
interface InstallmentRow { installment: string | number; dueDate: string; value: string; linkedGoal: string; }

/** Remove chaves com valor vazio/undefined de um objeto. */
function pruneEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== '' && v != null) out[k] = v;
  }
  return out as T;
}

@Component({
  selector: 'app-work-plan-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './work-plan-new.page.html',
  styleUrl: './work-plan-new.page.scss',
})
export class WorkPlanNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(WorkPlansService);
  private notify = inject(NotificationService);

  readonly groups   = BLOCK_GROUPS;
  readonly grantors = signal<WorkPlanRef[]>([]);
  readonly loading  = signal(false);

  /** Blocos ativos no canvas (ordem). */
  readonly blocks = signal<BlockInstance[]>([]);

  /** FormGroup por bloco (chave = uid). */
  private forms = new Map<number, FormGroup>();
  private uidSeq = 0;
  private dragIndex: number | null = null;

  /** Bloco-cabeçalho fixo. */
  readonly headerForm: FormGroup = this.fb.group({
    title:          ['', Validators.required],
    grantorId:      ['', Validators.required],
    instrumentType: [''],
  });

  ngOnInit(): void {
    this.svc.getGrantorsLookup().subscribe({
      next: rows => this.grantors.set(rows),
      error: () => this.notify.error('Erro ao carregar órgãos concessores.'),
    });
  }

  // ── Paleta ──────────────────────────────────────────────────────────────────

  isUsed(type: BlockType): boolean {
    return this.blocks().some(b => b.type === type);
  }

  addBlock(def: BlockDef): void {
    if (def.unique && this.isUsed(def.type)) return;
    const uid = ++this.uidSeq;
    this.forms.set(uid, this.createForm(def.type));
    this.blocks.update(list => [...list, { uid, type: def.type }]);
  }

  removeBlock(uid: number): void {
    this.forms.delete(uid);
    this.blocks.update(list => list.filter(b => b.uid !== uid));
  }

  formOf(uid: number): FormGroup {
    return this.forms.get(uid)!;
  }

  titleOf(type: BlockType): string {
    for (const g of this.groups) {
      const def = g.blocks.find(b => b.type === type);
      if (def) return def.title;
    }
    return type;
  }

  refLabel(g: WorkPlanRef): string {
    return g.legalName ?? g.tradeName ?? g.name ?? String(g.id);
  }

  // ── Reordenação (drag nativo) ────────────────────────────────────────────────

  onDragStart(index: number): void {
    this.dragIndex = index;
  }

  onDrop(index: number): void {
    if (this.dragIndex === null || this.dragIndex === index) { this.dragIndex = null; return; }
    this.blocks.update(list => {
      const arr = [...list];
      const [moved] = arr.splice(this.dragIndex!, 1);
      arr.splice(index, 0, moved);
      return arr;
    });
    this.dragIndex = null;
  }

  // ── Form factory por tipo ─────────────────────────────────────────────────────

  private createForm(type: BlockType): FormGroup {
    switch (type) {
      case 'program':
        return this.fb.group({
          programNumber:  [''],
          instrumentType: [''],
        });
      case 'celebrante':
        return this.fb.group({
          name:            ['', Validators.required],
          cnpj:            ['', Validators.required],
          zipCode:         [''],
          address:         [''],
          number:          [''],
          complement:      [''],
          actionLocations: [''],
          site:            [''],
          repName:         [''],
          repJobTitle:     [''],
          repRg:           [''],
          repExpOrgan:     [''],
          repCpf:          [''],
        });
      case 'executada':
        return this.fb.group({
          name:        ['', Validators.required],
          cnpj:        ['', Validators.required],
          zipCode:     [''],
          address:     [''],
          number:      [''],
          complement:  [''],
          repName:     [''],
          repJobTitle: [''],
          repRg:       [''],
          repExpOrgan: [''],
          repCpf:      [''],
        });
      case 'responsible':
        return this.fb.group({
          name:     ['', Validators.required],
          function: [''],
          rg:       [''],
          expOrgan: [''],
          cpf:      [''],
          phone:    [''],
          email:    [''],
        });
      case 'plan-data':
        return this.fb.group({
          proposalNumber:      [''],
          object:              [''],
          specificObjects:     [''],
          executionLocation:   [''],
          realityDescription:  [''],
          targetAudience:      [''],
          activityDescription: [''],
          startDate:           [''],
          endDate:             [''],
          repassValue:         [''],
          mandatoryCounterpart: [''],
          globalValue:         [''],
        });
      case 'goals':
        return this.fb.group({
          expectedResult:    [''],
          indicator:         [''],
          verificationMeans: [''],
          quantitativeMeta:  [''],
          networkAction:     ['Nao'],
          executionSteps:    this.fb.array([this.newStep()]),
        });
      case 'app-detailed':
        return this.fb.group({
          items: this.fb.array([this.newAppItem()]),
        });
      case 'disbursement':
        return this.fb.group({
          installments: this.fb.array([this.newInstallment(1)]),
        });
    }
  }

  // ── Linhas de tabelas (FormArray) ─────────────────────────────────────────────

  private newStep(): FormGroup {
    return this.fb.group({ step: [''], place: [''], period: [''], startDate: [''], endDate: [''] });
  }

  private newAppItem(): FormGroup {
    return this.fb.group({
      linkedGoal:    [''],
      linkedStep:    [''],
      expenseItem:   [''],
      inKindPayment: ['Nao'],
      expenseType:   [''],
      unit:          [''],
      quantity:      [''],
      unitValue:     [''],
      totalValue:    [''],
    });
  }

  private newInstallment(installment: number): FormGroup {
    return this.fb.group({ installment: [installment], dueDate: [''], value: [''], linkedGoal: [''] });
  }

  steps(uid: number): FormArray        { return this.formOf(uid).get('executionSteps') as FormArray; }
  appItems(uid: number): FormArray     { return this.formOf(uid).get('items') as FormArray; }
  installments(uid: number): FormArray { return this.formOf(uid).get('installments') as FormArray; }

  addStep(uid: number): void        { this.steps(uid).push(this.newStep()); }
  removeStep(uid: number, i: number): void { this.steps(uid).removeAt(i); }

  addAppItem(uid: number): void     { this.appItems(uid).push(this.newAppItem()); }
  removeAppItem(uid: number, i: number): void { this.appItems(uid).removeAt(i); }

  addInstallment(uid: number): void {
    const arr = this.installments(uid);
    arr.push(this.newInstallment(arr.length + 1));
  }
  removeInstallment(uid: number, i: number): void {
    const arr = this.installments(uid);
    arr.removeAt(i);
    arr.controls.forEach((c, idx) => c.get('installment')?.setValue(idx + 1));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  private allValid(): boolean {
    if (this.headerForm.invalid) return false;
    return [...this.forms.values()].every(f => f.valid);
  }

  save(): void {
    if (!this.allValid()) {
      this.headerForm.markAllAsTouched();
      this.forms.forEach(f => f.markAllAsTouched());
      this.notify.error('Preencha os campos obrigatórios (Título, Órgão e os campos marcados nos blocos).');
      return;
    }

    const h = this.headerForm.getRawValue();
    const payload: CreateWorkPlanPayload = {
      title:          h.title,
      grantorId:      Number(h.grantorId),
      instrumentType: h.instrumentType || undefined,
      status:         'Draft',
    };

    for (const block of this.blocks()) {
      const v = this.forms.get(block.uid)!.getRawValue();
      switch (block.type) {
        case 'program':
          if (v.programNumber)  payload.programNumber  = v.programNumber;
          if (v.instrumentType) payload.instrumentType = v.instrumentType;
          break;
        case 'celebrante':
          payload.celebrante = pruneEmpty(v) as CreateWorkPlanPayload['celebrante'];
          break;
        case 'executada':
          payload.executada = pruneEmpty(v) as CreateWorkPlanPayload['executada'];
          break;
        case 'responsible':
          payload.responsible = pruneEmpty(v) as CreateWorkPlanPayload['responsible'];
          break;
        case 'plan-data':
          payload.proposalNumber      = v.proposalNumber      || undefined;
          payload.object              = v.object              || undefined;
          payload.specificObjects     = v.specificObjects     || undefined;
          payload.executionLocation   = v.executionLocation   || undefined;
          payload.realityDescription  = v.realityDescription  || undefined;
          payload.targetAudience      = v.targetAudience      || undefined;
          payload.activityDescription = v.activityDescription || undefined;
          payload.startDate           = v.startDate           || undefined;
          payload.endDate             = v.endDate             || undefined;
          payload.repassValue         = toNumber(v.repassValue);
          payload.mandatoryCounterpart = toNumber(v.mandatoryCounterpart);
          payload.globalValue         = toNumber(v.globalValue);
          break;
        case 'goals': {
          const steps = (v.executionSteps as StepRow[])
            .filter(s => s.step || s.place || s.period || s.startDate || s.endDate);
          const goal = pruneEmpty({
            expectedResult:    v.expectedResult,
            indicator:         v.indicator,
            verificationMeans: v.verificationMeans,
            quantitativeMeta:  toNumber(v.quantitativeMeta),
            networkAction:     v.networkAction === 'Sim',
            executionSteps:    steps.length ? JSON.stringify(steps) : '',
          }) as WorkPlanGoalPayload;
          payload.goals = [...(payload.goals ?? []), goal];
          break;
        }
        case 'app-detailed': {
          const items = (v.items as AppItemRow[])
            .filter(r => r.expenseItem || r.expenseType || r.quantity || r.totalValue)
            .map(r => ({
              linkedGoalId:  toNumber(r.linkedGoal),
              linkedStepId:  toNumber(r.linkedStep),
              expenseItem:   r.expenseItem,
              inKindPayment: r.inKindPayment === 'Sim',
              expenseType:   r.expenseType,
              unit:          r.unit,
              quantity:      toNumber(r.quantity) ?? 0,
              unitValue:     toNumber(r.unitValue) ?? 0,
              totalValue:    toNumber(r.totalValue) ?? 0,
            }));
          if (items.length) payload.applicationPlans = items;
          break;
        }
        case 'disbursement': {
          const rows = (v.installments as InstallmentRow[])
            .filter(r => r.dueDate || r.value)
            .map((r, idx) => ({
              installment:  Number(r.installment) || idx + 1,
              monthYear:    r.dueDate,
              value:        toNumber(r.value) ?? 0,
              linkedGoalId: toNumber(r.linkedGoal),
            }));
          if (rows.length) payload.reimbursements = rows;
          break;
        }
      }
    }

    this.loading.set(true);
    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Plano de trabalho salvo com sucesso.');
        this.router.navigate(['/work-plans']);
      },
      error: err => {
        this.loading.set(false);
        const raw = err?.error?.message ?? 'Erro ao salvar o plano de trabalho.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }
}
