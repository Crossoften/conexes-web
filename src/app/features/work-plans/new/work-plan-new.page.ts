// src/app/features/work-plans/new/work-plan-new.page.ts
//
// Builder do "Novo Plano de Trabalho": paleta/índice à esquerda, canvas à direita.
// Bloco-cabeçalho fixo (Título / Órgão / Instrumento) + blocos adicionáveis,
// removíveis e reordenáveis (drag nativo). Batch 4a: blocos institucionais + dados
// do plano. Metas/Financeiro/Monitoramento/Blocos Livres + Preview/PDF nos próximos.

import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, AbstractControl, Validators } from '@angular/forms';
import { WorkPlansService } from '../work-plans.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { UploadService } from '../../../shared/services/upload.service';
import { formatBRL } from '../../../shared/utils/format';
import {
  WorkPlanRef,
  WorkPlanGoalPayload,
  WorkPlanDetail,
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
interface MemberRow { name: string; role: string; miniCv: string; }
interface ActionRow { goalOrAction: string; requiredInfo: string; collectionProcedure: string; collectionDate: string; responsible: string; }

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
  private route  = inject(ActivatedRoute);
  private svc    = inject(WorkPlansService);
  private notify = inject(NotificationService);
  private upload = inject(UploadService);

  /** UIDs de blocos Meta com upload de logo em andamento. */
  readonly goalLogoUploading = signal<Set<number>>(new Set());

  readonly groups   = BLOCK_GROUPS;
  readonly grantors = signal<WorkPlanRef[]>([]);
  readonly loading  = signal(false);
  readonly planId   = signal<number | null>(null);

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

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.planId.set(id);
      this.svc.getById(id).subscribe({
        next: detail => this.hydrate(detail),
        error: () => this.notify.error('Erro ao carregar o plano de trabalho.'),
      });
    }
  }

  // ── Paleta ──────────────────────────────────────────────────────────────────

  isUsed(type: BlockType): boolean {
    return this.blocks().some(b => b.type === type);
  }

  addBlock(def: BlockDef): void {
    if (def.unique && this.isUsed(def.type)) return;
    this.pushBlock(def.type);
  }

  private pushBlock(type: BlockType): number {
    const uid = ++this.uidSeq;
    this.forms.set(uid, this.createForm(type));
    this.blocks.update(list => [...list, { uid, type }]);
    return uid;
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
          logoUrl:           [''],
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
      case 'app-summary':
        return this.fb.group({}); // read-only, calculado dos outros blocos
      case 'team':
        return this.fb.group({ members: this.fb.array([this.newMember()]) });
      case 'monitoring':
        return this.fb.group({ actions: this.fb.array([this.newAction()]) });
      case 'free-text':
        return this.fb.group({ title: ['', Validators.required], content: [''] });
      case 'free-table':
        return this.fb.group({
          title:   ['', Validators.required],
          columns: this.fb.array([this.newColumn('Coluna 1'), this.newColumn('Coluna 2')]),
          rows:    this.fb.array([this.newFreeRow(2)]),
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

  // ── Logotipo da Meta (goals[].logoUrl) ──────────────────────────────────────
  goalLogoUrl(uid: number): string      { return this.formOf(uid).get('logoUrl')?.value ?? ''; }
  isGoalLogoUploading(uid: number): boolean { return this.goalLogoUploading().has(uid); }

  onGoalLogoSelected(event: Event, uid: number): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.goalLogoUploading.update(s => new Set(s).add(uid));
    this.upload.uploadOneFile(file).subscribe({
      next: res => {
        this.formOf(uid).get('logoUrl')?.setValue(res.fileUrl);
        this.goalLogoUploading.update(s => { const n = new Set(s); n.delete(uid); return n; });
        this.notify.success('Logotipo da meta enviado.');
      },
      error: () => {
        this.goalLogoUploading.update(s => { const n = new Set(s); n.delete(uid); return n; });
        this.notify.error('Erro ao enviar o logotipo.');
      },
    });
  }

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

  // Equipe / Monitoramento
  private newMember(): FormGroup { return this.fb.group({ name: [''], role: [''], miniCv: [''] }); }
  private newAction(): FormGroup {
    return this.fb.group({ goalOrAction: [''], requiredInfo: [''], collectionProcedure: [''], collectionDate: [''], responsible: [''] });
  }
  members(uid: number): FormArray { return this.formOf(uid).get('members') as FormArray; }
  actions(uid: number): FormArray { return this.formOf(uid).get('actions') as FormArray; }
  addMember(uid: number): void { this.members(uid).push(this.newMember()); }
  removeMember(uid: number, i: number): void { this.members(uid).removeAt(i); }
  addAction(uid: number): void { this.actions(uid).push(this.newAction()); }
  removeAction(uid: number, i: number): void { this.actions(uid).removeAt(i); }

  // Tabela Livre (colunas + linhas dinâmicas)
  private newColumn(name: string): FormGroup { return this.fb.group({ name: [name] }); }
  private newFreeRow(cols: number): FormGroup {
    return this.fb.group({ cells: this.fb.array(Array.from({ length: cols }, () => this.fb.control(''))) });
  }
  freeColumns(uid: number): FormArray { return this.formOf(uid).get('columns') as FormArray; }
  freeRows(uid: number): FormArray { return this.formOf(uid).get('rows') as FormArray; }
  rowCells(row: AbstractControl): FormArray { return row.get('cells') as FormArray; }

  addColumn(uid: number): void {
    this.freeColumns(uid).push(this.newColumn(`Coluna ${this.freeColumns(uid).length + 1}`));
    this.freeRows(uid).controls.forEach(r => (r.get('cells') as FormArray).push(this.fb.control('')));
  }
  removeColumn(uid: number, i: number): void {
    this.freeColumns(uid).removeAt(i);
    this.freeRows(uid).controls.forEach(r => (r.get('cells') as FormArray).removeAt(i));
  }
  addFreeRow(uid: number): void { this.freeRows(uid).push(this.newFreeRow(this.freeColumns(uid).length)); }
  removeFreeRow(uid: number, i: number): void { this.freeRows(uid).removeAt(i); }

  // Resumo financeiro (calculado dos blocos Dados do Plano + Aplicação Detalhado)
  private formByType(type: BlockType): FormGroup | null {
    const b = this.blocks().find(x => x.type === type);
    return b ? (this.forms.get(b.uid) ?? null) : null;
  }
  private planField(field: string): number {
    const f = this.formByType('plan-data');
    return f ? (toNumber(f.get(field)?.value) ?? 0) : 0;
  }
  summaryRepass(): number   { return this.planField('repassValue'); }
  summaryMandatory(): number { return this.planField('mandatoryCounterpart'); }
  summaryGlobal(): number   { return this.planField('globalValue'); }
  summaryItemsTotal(): number {
    const f = this.formByType('app-detailed');
    if (!f) return 0;
    const items = (f.get('items') as FormArray).getRawValue() as AppItemRow[];
    return items.reduce((sum, r) => sum + (toNumber(r.totalValue) ?? 0), 0);
  }
  fmt(v: number): string { return formatBRL(v); }

  // ── Submit ────────────────────────────────────────────────────────────────────

  /** Ordem/composição dos blocos + conteúdo dos blocos livres (persistido em `layout`). */
  private buildLayout(): unknown[] {
    return this.blocks().map(b => {
      const f = this.forms.get(b.uid)!;
      if (b.type === 'free-text') {
        return { type: b.type, title: f.get('title')?.value ?? '', content: f.get('content')?.value ?? '' };
      }
      if (b.type === 'free-table') {
        const columns = (f.get('columns') as FormArray).getRawValue().map((c: { name: string }) => c.name);
        const rows = (f.get('rows') as FormArray).getRawValue().map((r: { cells: string[] }) => r.cells);
        return { type: b.type, title: f.get('title')?.value ?? '', columns, rows };
      }
      return { type: b.type };
    });
  }

  // ── Edição: reconstrução dos blocos a partir da entidade ──────────────────────

  private str(v: unknown): string { return v == null ? '' : String(v); }
  private dateOnly(s: string | null | undefined): string { return s ? String(s).slice(0, 10) : ''; }
  private parseJson(s: string | null | undefined): Array<Record<string, unknown>> {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; }
    catch { return []; }
  }

  private hydrate(d: WorkPlanDetail): void {
    this.headerForm.patchValue({
      title:          d.title ?? '',
      grantorId:      d.grantorId != null ? String(d.grantorId) : '',
      instrumentType: d.instrumentType ?? '',
    });

    if (d.programNumber) {
      const f = this.forms.get(this.pushBlock('program'))!;
      f.patchValue({ programNumber: d.programNumber, instrumentType: d.instrumentType ?? '' });
    }

    if (d.proposalNumber || d.object || d.specificObjects || d.executionLocation || d.realityDescription ||
        d.targetAudience || d.activityDescription || d.startDate || d.endDate ||
        d.repassValue != null || d.mandatoryCounterpart != null || d.globalValue != null) {
      const f = this.forms.get(this.pushBlock('plan-data'))!;
      f.patchValue({
        proposalNumber:      this.str(d.proposalNumber),
        object:              this.str(d.object),
        specificObjects:     this.str(d.specificObjects),
        executionLocation:   this.str(d.executionLocation),
        realityDescription:  this.str(d.realityDescription),
        targetAudience:      this.str(d.targetAudience),
        activityDescription: this.str(d.activityDescription),
        startDate:           this.dateOnly(d.startDate),
        endDate:             this.dateOnly(d.endDate),
        repassValue:         d.repassValue != null ? String(d.repassValue) : '',
        mandatoryCounterpart: d.mandatoryCounterpart != null ? String(d.mandatoryCounterpart) : '',
        globalValue:         d.globalValue != null ? String(d.globalValue) : '',
      });
    }

    if (d.celebrante)  this.forms.get(this.pushBlock('celebrante'))!.patchValue(d.celebrante);
    if (d.executada)   this.forms.get(this.pushBlock('executada'))!.patchValue(d.executada);
    if (d.responsible) this.forms.get(this.pushBlock('responsible'))!.patchValue(d.responsible);

    (d.goals ?? []).forEach(g => {
      const f = this.forms.get(this.pushBlock('goals'))!;
      f.patchValue({
        expectedResult:    this.str(g.expectedResult),
        indicator:         this.str(g.indicator),
        verificationMeans: this.str(g.verificationMeans),
        quantitativeMeta:  g.quantitativeMeta != null ? String(g.quantitativeMeta) : '',
        networkAction:     g.networkAction ? 'Sim' : 'Nao',
        logoUrl:           this.str(g.logoUrl),
      });
      const steps = this.parseJson(g.executionSteps);
      if (steps.length) {
        const fa = f.get('executionSteps') as FormArray;
        fa.clear();
        steps.forEach(s => { const fg = this.newStep(); fg.patchValue(s); fa.push(fg); });
      }
    });

    if (d.applicationPlans?.length) {
      const fa = this.forms.get(this.pushBlock('app-detailed'))!.get('items') as FormArray;
      fa.clear();
      d.applicationPlans.forEach(it => {
        const fg = this.newAppItem();
        fg.patchValue({
          linkedGoal:    it.linkedGoalId != null ? String(it.linkedGoalId) : '',
          linkedStep:    it.linkedStepId != null ? String(it.linkedStepId) : '',
          expenseItem:   this.str(it.expenseItem),
          inKindPayment: it.inKindPayment ? 'Sim' : 'Nao',
          expenseType:   this.str(it.expenseType),
          unit:          this.str(it.unit),
          quantity:      it.quantity  != null ? String(it.quantity)  : '',
          unitValue:     it.unitValue != null ? String(it.unitValue) : '',
          totalValue:    it.totalValue != null ? String(it.totalValue) : '',
        });
        fa.push(fg);
      });
    }

    if (d.reimbursements?.length) {
      const fa = this.forms.get(this.pushBlock('disbursement'))!.get('installments') as FormArray;
      fa.clear();
      d.reimbursements.forEach((r, i) => {
        const fg = this.newInstallment(r.installment ?? i + 1);
        fg.patchValue({
          dueDate:    this.dateOnly(r.monthYear),
          value:      r.value != null ? String(r.value) : '',
          linkedGoal: r.linkedGoalId != null ? String(r.linkedGoalId) : '',
        });
        fa.push(fg);
      });
    }

    const members = this.parseJson(d.teamWorkContent);
    if (members.length) {
      const fa = this.forms.get(this.pushBlock('team'))!.get('members') as FormArray;
      fa.clear();
      members.forEach(m => { const fg = this.newMember(); fg.patchValue(m); fa.push(fg); });
    }

    const actions = this.parseJson(d.monitoringContent);
    if (actions.length) {
      const fa = this.forms.get(this.pushBlock('monitoring'))!.get('actions') as FormArray;
      fa.clear();
      actions.forEach(a => { const fg = this.newAction(); fg.patchValue(a); fa.push(fg); });
    }

    if (Array.isArray(d.layout)) {
      for (const raw of d.layout as Array<Record<string, unknown>>) {
        if (raw['type'] === 'free-text') {
          const f = this.forms.get(this.pushBlock('free-text'))!;
          f.patchValue({ title: this.str(raw['title']), content: this.str(raw['content']) });
        } else if (raw['type'] === 'free-table') {
          const f = this.forms.get(this.pushBlock('free-table'))!;
          const cols = Array.isArray(raw['columns']) ? raw['columns'] as string[] : [];
          const rows = Array.isArray(raw['rows']) ? raw['rows'] as string[][] : [];
          const colsFa = f.get('columns') as FormArray;
          const rowsFa = f.get('rows') as FormArray;
          colsFa.clear(); rowsFa.clear();
          cols.forEach(c => colsFa.push(this.newColumn(c)));
          if (colsFa.length === 0) colsFa.push(this.newColumn('Coluna 1'));
          rows.forEach(cells => {
            const list = cells.length ? cells : Array(colsFa.length).fill('');
            rowsFa.push(this.fb.group({ cells: this.fb.array(list.map(c => this.fb.control(c))) }));
          });
          if (rowsFa.length === 0) rowsFa.push(this.newFreeRow(colsFa.length));
        }
      }
    }
  }

  // ── Exportar PDF ──────────────────────────────────────────────────────────────

  exportPdf(): void {
    const id = this.planId();
    if (!id) { this.notify.info('Salve o plano antes de exportar o PDF.'); return; }
    this.svc.exportPdf(id).subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `plano-trabalho-${id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        const raw = err?.error?.message ?? 'Erro ao exportar PDF.';
        this.notify.error(Array.isArray(raw) ? raw.join(', ') : raw);
      },
    });
  }

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
            logoUrl:           v.logoUrl || undefined,
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
        case 'team': {
          const members = (v.members as MemberRow[]).filter(m => m.name || m.role || m.miniCv);
          if (members.length) payload.teamWorkContent = JSON.stringify(members);
          break;
        }
        case 'monitoring': {
          const actions = (v.actions as ActionRow[])
            .filter(a => a.goalOrAction || a.requiredInfo || a.collectionProcedure || a.collectionDate || a.responsible);
          if (actions.length) payload.monitoringContent = JSON.stringify(actions);
          break;
        }
        // app-summary é calculado; free-text/free-table ficam no layout.
      }
    }

    payload.layout = this.buildLayout();

    const id = this.planId();
    const request = id ? this.svc.update(id, payload) : this.svc.create(payload);

    this.loading.set(true);
    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success(id ? 'Plano de trabalho atualizado com sucesso.' : 'Plano de trabalho salvo com sucesso.');
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
