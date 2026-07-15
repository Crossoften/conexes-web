// src/app/features/stakeholders/new/stakeholder-new.page.ts
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { buildStakeholderForm } from './stakeholder-new.form';
import { Step1Component } from './step1/step1.component';
import { Step2Component } from './step2/step2.component';
import { Step3Component } from './step3/step3.component';
import { StakeholdersService } from '../stakeholders.service';
import { mapFormToPayload } from '../stakeholders.mapper';

export const WIZARD_STEPS = [
  { label: 'Etapa 1 - Dados gerais',           shortLabel: 'Etapa 1 - Dados gerais'           },
  { label: 'Etapa 2 - Classificação e Risco',   shortLabel: 'Etapa 2 - Classificação e Risco'  },
  { label: 'Etapa 3 - Observações e contatos',  shortLabel: 'Etapa 3 - Observações e contatos' },
];

@Component({
  selector: 'app-stakeholder-new',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, RouterLink, Step1Component, Step2Component, Step3Component],
  templateUrl: './stakeholder-new.page.html',
  styleUrl: './stakeholder-new.page.scss',
})
export class StakeholderNewPage {
  private router = inject(Router);
  private svc    = inject(StakeholdersService);

  readonly form  = buildStakeholderForm();
  readonly steps = WIZARD_STEPS;

  readonly currentStep = signal(0);
  readonly isFirst     = computed(() => this.currentStep() === 0);
  readonly isLast      = computed(() => this.currentStep() === this.steps.length - 1);

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  get step1Form() { return this.form.get('step1')!; }
  get step2Form() { return this.form.get('step2')!; }
  get step3Form() { return this.form.get('step3')!; }

  private currentStepForm() {
    return [this.step1Form, this.step2Form, this.step3Form][this.currentStep()];
  }

  next(): void {
    const stepForm = this.currentStepForm();
    if (stepForm.invalid) {
      stepForm.markAllAsTouched();
      return;
    }
    if (!this.isLast()) {
      this.currentStep.update(s => s + 1);
    } else {
      this.submit();
    }
  }

  back(): void {
    this.errorMsg.set(null);
    if (!this.isFirst()) {
      this.currentStep.update(s => s - 1);
    } else {
      this.router.navigate(['/stakeholders']);
    }
  }

  saveDraft(): void {
    // Salva localmente enquanto não há endpoint de rascunho no back
    const draft = JSON.stringify(this.form.value);
    localStorage.setItem('stakeholder_draft', draft);
    console.info('[StakeholderNew] Rascunho salvo no localStorage.');
  }

  private submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    const payload = mapFormToPayload(this.form.value);

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/stakeholders']);
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Erro ao salvar stakeholder. Tente novamente.';
        this.errorMsg.set(msg);
      },
    });
  }
  
}
