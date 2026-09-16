import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * AL-01: máscara de moeda (R$) reutilizável para campos de VALOR em todo o app.
 * Digite só números; o campo formata como 1.234,56 e o FormControl guarda o número (1234.56).
 * Uso: <input type="text" appCurrencyMask formControlName="valor">
 */
@Directive({
  selector: '[appCurrencyMask]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CurrencyMaskDirective), multi: true }],
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  private fmt(n: number): string {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  @HostListener('input', ['$event'])
  onInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (!digits) { input.value = ''; this.onChange(null); return; }
    const value = Number(digits) / 100;
    input.value = this.fmt(value);
    this.onChange(value);
  }

  @HostListener('blur')
  onBlur(): void { this.onTouched(); }

  writeValue(value: number | string | null): void {
    const n = value === null || value === undefined || value === '' ? null : Number(value);
    this.el.nativeElement.value = n === null || isNaN(n) ? '' : this.fmt(n);
  }
  registerOnChange(fn: (v: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.el.nativeElement.disabled = isDisabled; }
}
