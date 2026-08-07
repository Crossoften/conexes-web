// src/app/features/chart-of-accounts/new/chart-of-accounts-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChartOfAccountsService } from '../chart-of-accounts.service';
import { AccountPayload, Account } from '../chart-of-accounts.model';
import { environment } from '../../../../environments/environment';
import { CostCenterCreateModalComponent } from '../../cost-centers/components/cost-center-create.modal';
import { CostCenter } from '../../cost-centers/cost-centers.model';

interface ProjectOption {
  id:   number;
  name: string;
}

@Component({
  selector: 'app-chart-of-accounts-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass, CostCenterCreateModalComponent],
  templateUrl: './chart-of-accounts-new.page.html',
  styleUrl: './chart-of-accounts-new.page.scss',
})
export class ChartOfAccountsNewPage implements OnInit {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private svc    = inject(ChartOfAccountsService);
  private http   = inject(HttpClient);

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  projects: ProjectOption[] = [];
  /** Contas candidatas a "pai" de uma subconta (Totalizadora/Sintética). */
  parents: Account[] = [];

  /** B2: modal de criação inline de Centro de Custo. */
  readonly showCcModal = signal(false);

  form: FormGroup = this.fb.group({
    categoryType:   ['', Validators.required],
    accountType:    [''],
    categoryGroup:  ['', Validators.required],
    costCenter:     ['', Validators.required],
    categoryCode:   ['', Validators.required],
    categoryTitle:  ['', Validators.required],
    budgetMgmt:     [false],
    provCredit:     [''],
    provDebit:      [''],
    writeOffCredit: [''],
    writeOffDebit:  [''],
    description:    [''],
    parentId:       [null],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProjects();
    this.loadParents();
  }

  /** Carrega as contas que podem ser "conta superior" (Totalizadora/Sintética). */
  private loadParents(): void {
    this.svc.getAll().subscribe({
      next: list => { this.parents = list.filter(a => a.categoryType === 'Totalizadora' || a.accountType === 'Sintetica'); },
      error: ()   => { this.parents = []; },
    });
  }

  private loadProjects(): void {
    this.http
      .get<{ data: (ProjectOption & { _entityType: string })[] }>(
        `${environment.apiUrl}/v1/projects`,
        { params: { take: '100' } }
      )
      .subscribe({
        next: res => { this.projects = (res.data ?? []).filter(p => p._entityType === 'cost_center'); },
        error: ()  => { this.projects = []; },
      });
  }

  // ── B2: criação inline de Centro de Custo ─────────────────────────────────

  openCcModal(): void  { this.showCcModal.set(true); }
  closeCcModal(): void { this.showCcModal.set(false); }

  onCcCreated(cc: CostCenter): void {
    const name = cc.name || cc.title || cc.code;
    this.projects = [...this.projects, { id: cc.id, name }];
    this.form.patchValue({ costCenter: cc.id });
    this.showCcModal.set(false);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  resetForm(): void {
    this.form.reset({
      categoryType:   '',
      accountType:    '',
      categoryGroup:  '',
      costCenter:     '',
      categoryCode:   '',
      categoryTitle:  '',
      budgetMgmt:     false,
      provCredit:     '',
      provDebit:      '',
      writeOffCredit: '',
      writeOffDebit:  '',
      description:    '',
      parentId:       null,
    });
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

    const payload: AccountPayload = {
      code:              v.categoryCode   ?? '',
      title:             v.categoryTitle  ?? '',
      category:          v.costCenter     ?? '',
      categoryGroup:     v.categoryGroup  ?? '',
      categoryType:      v.categoryType   ?? '',
      accountType:       v.accountType    ?? '',
      budgetManagement:  !!v.budgetMgmt,
      description:       v.description    ?? '',
      status:            'Active',
      secondaryActivity: '',
      creditProvision:   v.provCredit     ?? '',
      debitProvision:    v.provDebit      ?? '',
      creditWriteOff:    v.writeOffCredit ?? '',
      debitWriteOff:     v.writeOffDebit  ?? '',
      parentId:          v.parentId ? Number(v.parentId) : null,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/chart-of-accounts']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar conta. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}