// src/app/features/stakeholders/new/step3/step3.component.ts
import { Component, input } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { StakeholderService } from '../../stakeholders.model';
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

  // ── Serviços (lista dinâmica — 5.2) ────────────────────────────────────────
  get servicesList(): StakeholderService[] {
    return this.f['services']?.value ?? [];
  }

  addService(): void {
    const name = (this.f['serviceName']?.value ?? '').trim();
    if (!name) return;
    const item: StakeholderService = {
      name,
      description:   (this.f['serviceDesc']?.value    ?? '').trim(),
      externalCode:  (this.f['serviceExtCode']?.value ?? '').trim(),
      grantorOrgan:  (this.f['serviceGrantor']?.value ?? '').trim(),
      hasRetention:  !!this.f['serviceRedemption']?.value,
      accessorOrgan: (this.f['serviceLinked']?.value  ?? '').trim(),
    };
    this.f['services']?.setValue([...this.servicesList, item]);
    this.f['serviceName']?.setValue('');
    this.f['serviceDesc']?.setValue('');
    this.f['serviceExtCode']?.setValue('');
    this.f['serviceGrantor']?.setValue('');
    this.f['serviceRedemption']?.setValue(false);
    this.f['serviceLinked']?.setValue('');
  }

  removeService(index: number): void {
    this.f['services']?.setValue(this.servicesList.filter((_, i) => i !== index));
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
