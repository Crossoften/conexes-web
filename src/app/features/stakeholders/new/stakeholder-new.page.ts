// src/app/features/stakeholders/new/stakeholder-new.page.ts
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { buildStakeholderForm } from './stakeholder-new.form';
import { Step1Component } from './step1/step1.component';
import { Step2Component } from './step2/step2.component';
import { Step3Component } from './step3/step3.component';
import { StakeholdersService } from '../stakeholders.service';
import { mapFormToPayload } from '../stakeholders.mapper';
import { NotificationService } from '../../../shared/services/notification.service';
import { StakeholderView } from '../stakeholders.model';

/** Seções do formulário (barra única de abas, layout aprovado). */
// FORN-fix: 'impostos' removido — o cadastro de fornecedor não gere mais dados fiscais.
export type FormSection =
  | 'rateio' | 'bancario' | 'contato' | 'privacidade' | 'compliance';

@Component({
  selector: 'app-stakeholder-new',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, RouterLink, Step1Component, Step2Component, Step3Component],
  templateUrl: './stakeholder-new.page.html',
  styleUrl: './stakeholder-new.page.scss',
})
export class StakeholderNewPage {
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private svc    = inject(StakeholdersService);
  private notify = inject(NotificationService);

  readonly form = buildStakeholderForm();

  /** Visão de origem (Fornecedores/Clientes) — deriva toda a terminologia da tela. */
  readonly view = signal<StakeholderView>(
    this.route.snapshot.queryParamMap.get('view') === 'clients' ? 'clients' : 'suppliers'
  );
  readonly entityLabel = computed(() => this.view() === 'clients' ? 'cliente' : 'fornecedor');

  readonly section = signal<FormSection>('rateio');

  readonly loading  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  constructor() {
    const typeCtrl = this.form.get('step1.type');
    if (typeCtrl && !typeCtrl.value) {
      typeCtrl.setValue(this.view() === 'clients' ? 'Customer' : 'Supplier');
    }
  }

  get step1Form() { return this.form.get('step1')!; }
  get step2Form() { return this.form.get('step2')!; }
  get step3Form() { return this.form.get('step3')!; }

  finalize(): void { this.submit(); }

  back(): void {
    this.errorMsg.set(null);
    this.router.navigate(['/stakeholders']);
  }

  saveDraft(): void {
    // Salva localmente enquanto não há endpoint de rascunho no back
    const draft = JSON.stringify(this.form.value);
    localStorage.setItem('stakeholder_draft', draft);
    this.notify.success('Rascunho salvo.');
  }

  private submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Preencha os campos obrigatórios antes de finalizar.');
      return;
    }

    // Blocos "completo ou vazio": se o usuário preencheu parte do endereço ou dos
    // dados bancários, exige o conjunto obrigatório (evita 400 e dados incompletos).
    const blockError = this.validateBlocks();
    if (blockError) {
      this.errorMsg.set(blockError.message);
      this.section.set(blockError.section);
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
        const msg = err?.error?.message ?? 'Erro ao salvar o cadastro. Tente novamente.';
        this.errorMsg.set(msg);
      },
    });
  }

  /** Valida endereço e dados bancários como "bloco completo ou vazio". */
  private validateBlocks(): { message: string; section: FormSection } | null {
    const s1: any = this.step1Form.value;
    const filled = (v: any) => !!(typeof v === 'string' ? v.trim() : v);

    // Endereço: se qualquer campo foi preenchido, exige o conjunto obrigatório.
    const addrRequired = [s1.zipCode, s1.address, s1.addressNum, s1.district, s1.city, s1.state];
    const anyAddress   = addrRequired.some(filled) || filled(s1.complement);
    if (anyAddress && !addrRequired.every(filled)) {
      return { message: 'Endereço incompleto: preencha CEP, Endereço, Nº, Bairro, Cidade e UF — ou deixe todos em branco.', section: 'rateio' };
    }

    // Dados bancários: idem. Nome/documento do correntista seguem o titular ou o correntista.
    const holderName = s1.differentHolder ? s1.holderName     : s1.name;
    const holderDoc  = s1.differentHolder ? s1.holderDocument : s1.document;
    const bankRequired = [holderName, holderDoc, s1.bank, s1.agency, s1.account];
    const anyBank = [s1.bank, s1.agency, s1.agencyDigit, s1.account, s1.accountDigit,
                     s1.pixKey, s1.holderName, s1.holderDocument].some(filled);
    if (anyBank && !bankRequired.every(filled)) {
      return { message: 'Dados bancários incompletos: preencha nome do correntista, documento, banco, agência e conta — ou deixe em branco.', section: 'bancario' };
    }

    return null;
  }

}
