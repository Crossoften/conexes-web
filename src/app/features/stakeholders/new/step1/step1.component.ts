// src/app/features/stakeholders/new/step1/step1.component.ts
import { Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NgClass } from '@angular/common';

type Step1Tab = 'rateio' | 'bancario';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss',
})
export class Step1Component {
  form = input.required<AbstractControl>();

  activeTab = signal<Step1Tab>('rateio');

  get f() { return (this.form() as any).controls; }

  isInvalid(field: string): boolean {
    const ctrl = this.f[field];
    return ctrl?.invalid && ctrl?.touched;
  }

  // ── Máscaras ──────────────────────────────────────────────────────────────

  /** CPF: 000.000.000-00 | CNPJ: 00.000.000/0000-00 */
  applyDocumentMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 14);
    const isPF   = this.f['personType']?.value === 'PF';

    let masked = digits;
    if (isPF) {
      masked = digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      masked = digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    input.value = masked;
    this.f['document']?.setValue(masked, { emitEvent: false });
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

  /** CEP: 00000-000 */
  applyCepMask(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');

    input.value = masked;
    this.f['zipCode']?.setValue(masked, { emitEvent: false });
  }

  /** Apenas números */
  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }
}
