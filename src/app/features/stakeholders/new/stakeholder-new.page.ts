// src/app/features/stakeholders/new/stakeholder-new.page.ts
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { buildStakeholderForm } from './stakeholder-new.form';
import { Step1Component } from './step1/step1.component';
import { Step2Component } from './step2/step2.component';
import { Step3Component } from './step3/step3.component';

export const WIZARD_STEPS = [
  { label: 'Etapa 1 - Dados gerais',           shortLabel: 'Etapa 1 - Dados gerais'          },
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

  readonly form  = buildStakeholderForm();
  readonly steps = WIZARD_STEPS;

  readonly currentStep = signal(0);
  readonly isFirst     = computed(() => this.currentStep() === 0);
  readonly isLast      = computed(() => this.currentStep() === this.steps.length - 1);

  get step1Form() { return this.form.get('step1')!; }
  get step2Form() { return this.form.get('step2')!; }
  get step3Form() { return this.form.get('step3')!; }

  private currentStepForm() {
    return [this.step1Form, this.step2Form, this.step3Form][this.currentStep()];
  }

  next() {
    const stepForm = this.currentStepForm();
    if (stepForm.invalid) {
      stepForm.markAllAsTouched();
      return;
    }
    if (!this.isLast()) this.currentStep.update(s => s + 1);
    else this.submit();
  }

  back() {
    if (!this.isFirst()) this.currentStep.update(s => s - 1);
    else this.router.navigate(['/stakeholders']);
  }

  saveDraft() {
    console.log('Salvar rascunho', this.form.value);
    // TODO: conectar ao service
  }

  private submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    console.log('Salvar stakeholder', this.form.value);
    // TODO: conectar ao service → navegar de volta
    this.router.navigate(['/stakeholders']);
  }
}
