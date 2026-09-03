// src/app/features/stakeholders/new/step3/step3.component.ts
import { Component, input } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import type { FormSection } from '../stakeholder-new.page';

@Component({
  selector: 'app-step3',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step3.component.html',
  styleUrl: './step3.component.scss',
})
export class Step3Component {
  form        = input.required<AbstractControl>();
  entityLabel = input<string>('fornecedor');
  section     = input.required<FormSection>();

  get f() { return (this.form() as any).controls; }

  isInvalid(field: string): boolean {
    const ctrl = this.f[field];
    return ctrl?.invalid && ctrl?.touched;
  }

  /** Telefone: (00) 00000-0000 */
  applyPhoneMask(event: Event, controlName: string): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    input.value = masked;
    this.f[controlName]?.setValue(masked, { emitEvent: false });
  }

  /** Apenas números */
  onlyNumbers(event: KeyboardEvent): boolean {
    // permite atalhos (colar/copiar/recortar/selecionar) e edição/navegação
    if (event.ctrlKey || event.metaKey) return true;
    const nav = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (nav.includes(event.key)) return true;
    return /^\d$/.test(event.key);
  }
}
