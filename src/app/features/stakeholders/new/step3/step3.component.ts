// src/app/features/stakeholders/new/step3/step3.component.ts
import { Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';

type Step3Tab = 'contato' | 'impostos';

@Component({
  selector: 'app-step3',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step3.component.html',
  styleUrl: './step3.component.scss',
})
export class Step3Component {
  form = input.required<AbstractControl>();
  activeTab = signal<Step3Tab>('contato');

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
    return /\d/.test(event.key) || event.key === 'Backspace' || event.key === 'Tab';
  }

  readonly aliquotFields = [
    { aliq: 'aliqIRRF',   aliqLabel: 'Alíquota % IRRF',   cod: 'codIRRF',   codLabel: 'Cód. IRRF'   },
    { aliq: 'aliqPIS',    aliqLabel: 'Alíquota % PIS',    cod: 'codPIS',    codLabel: 'Cód. PIS'    },
    { aliq: 'aliqPCC',    aliqLabel: 'Alíquota % PCC',    cod: 'codPCC',    codLabel: 'Cód. PCC'    },
    { aliq: 'aliqCOFINS', aliqLabel: 'Alíquota % COFINS', cod: 'codCOFINS', codLabel: 'Cód. COFINS' },
    { aliq: 'aliqINSS',   aliqLabel: 'Alíquota % INSS',   cod: 'codINSS',   codLabel: 'Cód. INSS'   },
    { aliq: 'aliqCSLL',   aliqLabel: 'Alíquota % CSLL',   cod: 'codCSLL',   codLabel: 'Cód. CSLL'   },
    { aliq: 'aliqISS',    aliqLabel: 'Alíquota % ISS',    cod: 'codISS',    codLabel: 'Cód. ISS'    },
    { aliq: 'aliqIBS',    aliqLabel: 'Alíquota % IBS',    cod: 'codIBS',    codLabel: 'Cód. IBS'    },
    { aliq: 'aliqCBS',    aliqLabel: 'Alíquota % CBS',    cod: 'codCBS',    codLabel: 'Cód. CBS'    },
  ];
}
