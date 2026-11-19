// src/app/shared/components/period-field/period-field.component.ts
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';

export interface PeriodValue { start: string; end: string; }

type Preset = 'all' | 'thisMonth' | 'lastMonth' | 'last90' | 'thisYear' | 'custom';

/**
 * Card #768 (itens 37, 46, 59, 68 e 72 — cenário 25): o período em UM só campo.
 * Abre as opções Todo o período, Este mês, Mês passado, Últimos 90 dias, Este ano e
 * Personalizado (que abre o calendário para o intervalo). Datas em AAAA-MM-DD,
 * como os filtros já mandam para a API.
 */
@Component({
  selector: 'app-period-field',
  standalone: true,
  template: `
    <div class="pf">
      <button type="button" class="pf__btn" [class.pf__btn--ativo]="!!start || !!end" (click)="toggle()" [attr.aria-expanded]="aberto()" title="Período">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>{{ rotulo() }}</span>
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      @if (aberto()) {
        <div class="pf__menu" role="menu">
          @for (o of opcoes; track o.v) {
            <button type="button" class="pf__opt" [class.pf__opt--sel]="atual() === o.v" (click)="escolher(o.v)">{{ o.r }}</button>
          }
          @if (personalizado()) {
            <div class="pf__custom">
              <label>De <input type="date" [value]="rascunho.start" (click)="picker($event)" (change)="rascunho.start = $any($event.target).value"></label>
              <label>Até <input type="date" [value]="rascunho.end" (click)="picker($event)" (change)="rascunho.end = $any($event.target).value"></label>
              <div class="pf__acoes">
                <button type="button" class="pf__limpar" (click)="escolher('all')">Limpar</button>
                <button type="button" class="pf__aplicar" (click)="aplicar()">Aplicar</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; position: relative; }
    .pf__btn { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 999px;
      border: 1px solid var(--surface-border-mid, #E5E7EB); background: #fff; color: var(--text-secondary, #4B5563);
      font-size: 13px; font-family: var(--font-body); cursor: pointer; white-space: nowrap; }
    .pf__btn:hover { border-color: #C4B5FD; }
    .pf__btn--ativo { border-color: var(--brand-purple, #6D28D9); color: var(--brand-purple, #6D28D9); }
    .pf__menu { position: absolute; top: calc(100% + 6px); left: 0; z-index: 60; background: #fff; border: 1px solid #E5E7EB;
      border-radius: 12px; box-shadow: 0 12px 28px rgba(17,24,39,.14); padding: 6px; min-width: 220px; display: flex; flex-direction: column; }
    .pf__opt { text-align: left; border: 0; background: transparent; padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; color: #374151; }
    .pf__opt:hover { background: #F5F3FF; }
    .pf__opt--sel { background: #EDE9FE; color: #5B21B6; font-weight: 600; }
    .pf__custom { border-top: 1px solid #F1F1F5; margin-top: 4px; padding: 10px 8px 4px; display: flex; flex-direction: column; gap: 8px; }
    .pf__custom label { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; color: #6B7280; }
    .pf__custom input { border: 1px solid #E5E7EB; border-radius: 8px; padding: 6px 8px; font-size: 13px; }
    .pf__acoes { display: flex; justify-content: space-between; }
    .pf__limpar { border: 0; background: transparent; color: #6D28D9; cursor: pointer; font-size: 12.5px; }
    .pf__aplicar { border: 0; background: var(--brand-orange, #F97316); color: #fff; border-radius: 999px; padding: 6px 16px; cursor: pointer; font-size: 12.5px; font-weight: 600; }
  `],
})
export class PeriodFieldComponent {
  private host = inject(ElementRef);

  @Input() start = '';
  @Input() end = '';
  @Output() periodChange = new EventEmitter<PeriodValue>();

  readonly aberto = signal(false);
  readonly personalizado = signal(false);
  rascunho: PeriodValue = { start: '', end: '' };

  readonly opcoes: { v: Preset; r: string }[] = [
    { v: 'all', r: 'Todo o período' },
    { v: 'thisMonth', r: 'Este mês' },
    { v: 'lastMonth', r: 'Mês passado' },
    { v: 'last90', r: 'Últimos 90 dias' },
    { v: 'thisYear', r: 'Este ano' },
    { v: 'custom', r: 'Personalizado' },
  ];

  @HostListener('document:click', ['$event'])
  fora(ev: MouseEvent): void {
    if (this.aberto() && !this.host.nativeElement.contains(ev.target)) this.aberto.set(false);
  }

  toggle(): void {
    const abrir = !this.aberto();
    this.aberto.set(abrir);
    if (abrir) {
      this.personalizado.set(this.atual() === 'custom');
      this.rascunho = { start: this.start, end: this.end };
    }
  }

  picker(ev: Event): void {
    const el = ev.target as HTMLInputElement & { showPicker?: () => void };
    try { el.showPicker?.(); } catch { /* sem showPicker */ }
  }

  private static iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  static intervalo(p: Preset): PeriodValue {
    const hoje = new Date();
    const y = hoje.getFullYear(), m = hoje.getMonth();
    const iso = PeriodFieldComponent.iso;
    switch (p) {
      case 'thisMonth': return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
      case 'lastMonth': return { start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) };
      case 'last90':    return { start: iso(new Date(y, m, hoje.getDate() - 89)), end: iso(hoje) };
      case 'thisYear':  return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
      default:          return { start: '', end: '' };
    }
  }

  atual(): Preset {
    if (!this.start && !this.end) return 'all';
    for (const p of ['thisMonth', 'lastMonth', 'last90', 'thisYear'] as Preset[]) {
      const r = PeriodFieldComponent.intervalo(p);
      if (r.start === this.start && r.end === this.end) return p;
    }
    return 'custom';
  }

  rotulo(): string {
    const a = this.atual();
    if (a !== 'custom') return this.opcoes.find(o => o.v === a)!.r;
    const br = (s: string) => (s ? s.split('-').reverse().join('/') : '…');
    return `${br(this.start)} – ${br(this.end)}`;
  }

  escolher(p: Preset): void {
    if (p === 'custom') { this.personalizado.set(true); return; }
    this.personalizado.set(false);
    this.aberto.set(false);
    this.periodChange.emit(PeriodFieldComponent.intervalo(p));
  }

  aplicar(): void {
    let { start, end } = this.rascunho;
    if (start && end && start > end) [start, end] = [end, start];
    this.aberto.set(false);
    this.periodChange.emit({ start, end });
  }
}
