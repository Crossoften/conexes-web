// src/app/shared/utils/wizard.controller.ts
import { signal, computed } from '@angular/core';

/**
 * Controlador de wizard reutilizável.
 * Instancie diretamente na page — não é injectable.
 *
 * @example
 * wizard = new WizardController(4);
 * // No template: [currentStep]="wizard.step()"
 */
export class WizardController {
  readonly step:  ReturnType<typeof signal<number>>;
  readonly total: number;

  constructor(totalSteps: number) {
    this.total = totalSteps;
    this.step  = signal(0);
  }

  readonly isFirst   = computed(() => this.step() === 0);
  readonly isLast    = computed(() => this.step() === this.total - 1);
  readonly progress  = computed(() =>
    this.total > 1
      ? Math.round((this.step() / (this.total - 1)) * 100)
      : 100
  );

  next()              { if (!this.isLast())  this.step.update(s => s + 1); }
  prev()              { if (!this.isFirst()) this.step.update(s => s - 1); }
  goTo(n: number)     { this.step.set(Math.max(0, Math.min(n, this.total - 1))); }
  reset()             { this.step.set(0); }
}
