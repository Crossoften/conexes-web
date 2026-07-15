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

    // Blocos "completo ou vazio": se o usuário preencheu parte do endereço ou dos
    // dados bancários, exige o conjunto obrigatório (evita 400 e dados incompletos).
    const blockError = this.validateBlocks();
    if (blockError) {
      this.errorMsg.set(blockError);
      this.currentStep.set(0);
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

  /** Valida endereço e dados bancários como "bloco completo ou vazio". */
  private validateBlocks(): string | null {
    const s1: any = this.step1Form.value;
    const filled = (v: any) => !!(typeof v === 'string' ? v.trim() : v);

    // Endereço: se qualquer campo foi preenchido, exige o conjunto obrigatório.
    const addrRequired = [s1.zipCode, s1.address, s1.addressNum, s1.district, s1.city, s1.state];
    const anyAddress   = addrRequired.some(filled) || filled(s1.complement);
    if (anyAddress && !addrRequired.every(filled)) {
      return 'Endereço incompleto: preencha CEP, Endereço, Nº, Bairro, Cidade e UF — ou deixe todos em branco.';
    }

    // Dados bancários: idem. Nome/documento do correntista seguem o titular ou o correntista.
    const holderName = s1.differentHolder ? s1.holderName     : s1.name;
    const holderDoc  = s1.differentHolder ? s1.holderDocument : s1.document;
    const bankRequired = [holderName, holderDoc, s1.bank, s1.agency, s1.account];
    const anyBank = [s1.bank, s1.agency, s1.agencyDigit, s1.account, s1.accountDigit,
                     s1.pixKey, s1.holderName, s1.holderDocument].some(filled);
    if (anyBank && !bankRequired.every(filled)) {
      return 'Dados bancários incompletos: preencha nome do correntista, documento, banco, agência e conta — ou deixe em branco.';
    }

    return null;
  }

}
