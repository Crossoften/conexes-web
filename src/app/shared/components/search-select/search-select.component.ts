// src/app/shared/components/search-select/search-select.component.ts
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, forwardRef, inject, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchOption { id: number | string; label: string; sublabel?: string; }

const semAcento = (t: string) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Card #768 (itens 53, 46 e 59): campo de pesquisa dinâmico. O usuário digita parte
 * do nome e o campo traz TODOS os registros que contêm o texto, em ordem alfabética,
 * com o detalhe (fornecedor, valor, documento) abaixo de cada um. Substitui as
 * listas de seleção que ficavam inviáveis com muitos registros (200+ pedidos).
 * É um ControlValueAccessor: o valor do controle é o id escolhido ('' quando vazio).
 */
@Component({
  selector: 'app-search-select',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelectComponent), multi: true }],
  template: `
    <div class="ss" [class.ss--disabled]="disabled" [class.ss--invalid]="invalid">
      <div class="ss__box">
        <svg class="ss__lupa" viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <input class="ss__input" type="text" [placeholder]="placeholder" [value]="texto()" [disabled]="disabled"
               (focus)="abrir()" (input)="digitar($any($event.target).value)" (keydown)="tecla($event)" autocomplete="off">
        @if (valor() !== '' && !disabled) {
          <button type="button" class="ss__limpar" title="Limpar" aria-label="Limpar" (click)="limpar()">✕</button>
        }
      </div>
      @if (addButton) {
        <button type="button" class="btn-plus-circle ss__add" [title]="addTitle" [attr.aria-label]="addTitle" (click)="add.emit()" [disabled]="disabled">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
      }
      @if (aberto()) {
        <div class="ss__menu" role="listbox">
          @for (o of filtradas(); track o.id; let i = $index) {
            <button type="button" class="ss__opt" role="option" [class.ss__opt--ativa]="i === cursor()" [class.ss__opt--sel]="o.id == valor()" (mousedown)="$event.preventDefault()" (click)="escolher(o)">
              <span class="ss__opt-label">{{ o.label }}</span>
              @if (o.sublabel) { <span class="ss__opt-sub">{{ o.sublabel }}</span> }
            </button>
          }
          @if (!filtradas().length) { <div class="ss__vazio">Nenhum registro contém “{{ busca() }}”.</div> }
          <div class="ss__rodape">{{ filtradas().length }} resultado(s){{ ordenar ? ', em ordem alfabética' : '' }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .ss { display: flex; align-items: center; gap: 8px; position: relative; }
    .ss__box { position: relative; flex: 1; min-width: 0; }
    .ss__lupa { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
    .ss__input { width: 100%; padding: 11px 34px 11px 36px; border: 1px solid var(--surface-border-mid, #D1D5DB); border-radius: 24px;
      font-size: 13.5px; font-family: var(--font-body); color: var(--text-primary); background: var(--surface-primary, #fff); outline: none; }
    .ss__input:focus { border-color: var(--brand-orange, #F97316); box-shadow: 0 0 0 3px rgba(249,115,22,.1); }
    .ss--invalid .ss__input { border-color: #EF4444; }
    .ss--disabled .ss__input { background: #F3F4F6; color: #6B7280; }
    .ss__limpar { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: 0; background: transparent; color: #9CA3AF; cursor: pointer; font-size: 12px; }
    .ss__add { flex-shrink: 0; }
    .ss__menu { position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 90; background: #fff; border: 1px solid #E5E7EB;
      border-radius: 12px; box-shadow: 0 12px 28px rgba(17,24,39,.14); max-height: 280px; overflow: auto; padding: 6px; }
    .ss__opt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left; border: 0; background: transparent;
      padding: 8px 10px; border-radius: 8px; cursor: pointer; }
    .ss__opt:hover, .ss__opt--ativa { background: #F5F3FF; }
    .ss__opt--sel .ss__opt-label { color: #5B21B6; }
    .ss__opt-label { font-size: 13px; font-weight: 600; color: #111827; }
    .ss__opt-sub { font-size: 11.5px; color: #6B7280; }
    .ss__vazio { padding: 10px; font-size: 12.5px; color: #6B7280; }
    .ss__rodape { padding: 6px 10px 2px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F3F4F6; margin-top: 4px; }
  `],
})
export class SearchSelectComponent implements ControlValueAccessor {
  private host = inject(ElementRef);

  @Input() set options(v: SearchOption[] | null) { this.opcoes.set(v ?? []); }
  @Input() placeholder = 'Pesquisar…';
  @Input() addButton = false;
  @Input() addTitle = 'Cadastrar';
  @Input() ordenar = true;
  @Input() invalid = false;
  @Output() add = new EventEmitter<void>();
  @Output() picked = new EventEmitter<SearchOption | null>();

  readonly opcoes = signal<SearchOption[]>([]);
  readonly valor = signal<number | string>('');
  readonly busca = signal('');
  readonly aberto = signal(false);
  readonly cursor = signal(0);
  disabled = false;

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selecionada = computed(() => this.opcoes().find(o => String(o.id) === String(this.valor())) ?? null);

  /** O texto da caixa: a busca em andamento ou o rótulo do escolhido. */
  readonly texto = computed(() => (this.aberto() ? this.busca() : (this.selecionada()?.label ?? '')));

  readonly filtradas = computed(() => {
    const termo = semAcento(this.busca().trim());
    let l = this.opcoes().filter(o => !termo || semAcento(`${o.label} ${o.sublabel ?? ''}`).includes(termo));
    if (this.ordenar) l = [...l].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }));
    return l;
  });

  @HostListener('document:click', ['$event'])
  fora(ev: MouseEvent): void {
    if (this.aberto() && !this.host.nativeElement.contains(ev.target)) this.fechar();
  }

  abrir(): void {
    if (this.disabled) return;
    this.busca.set('');
    this.cursor.set(0);
    this.aberto.set(true);
  }
  fechar(): void { this.aberto.set(false); this.onTouched(); }

  digitar(t: string): void {
    this.busca.set(t);
    this.cursor.set(0);
    if (!this.aberto()) this.aberto.set(true);
  }

  tecla(ev: KeyboardEvent): void {
    const n = this.filtradas().length;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); this.cursor.set(Math.min(n - 1, this.cursor() + 1)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); this.cursor.set(Math.max(0, this.cursor() - 1)); }
    else if (ev.key === 'Enter') { ev.preventDefault(); const o = this.filtradas()[this.cursor()]; if (o) this.escolher(o); }
    else if (ev.key === 'Escape') { this.fechar(); }
  }

  escolher(o: SearchOption): void {
    this.valor.set(o.id);
    this.onChange(String(o.id));
    this.picked.emit(o);
    this.fechar();
  }

  limpar(): void {
    this.valor.set('');
    this.onChange('');
    this.picked.emit(null);
  }

  writeValue(v: any): void { this.valor.set(v === null || v === undefined ? '' : v); }
  registerOnChange(fn: (v: any) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }
}
