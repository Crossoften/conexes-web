// src/app/shared/components/popup-shell/popup-shell.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Card #768 — padrão único dos pop-ups (itens 7, 16, 18, 20, 30, 35, 53, 65):
 * cabeçalho roxo com ícone, título e subtítulo, ações redondas laranja
 * (Editar/Excluir) e Fechar em X branco; corpo em quadro lavanda.
 *
 * Uso: <app-popup-shell title="…" subtitle="…" icon="bank" (close)="…">conteúdo</app-popup-shell>
 * Botões extras do cabeçalho entram no slot [popup-actions].
 */
@Component({
  selector: 'app-popup-shell',
  standalone: true,
  template: `
    <div class="ps-overlay" (click)="closeOnBackdrop && close.emit()">
      <div class="ps-container" [style.maxWidth.px]="width" (click)="$event.stopPropagation()" role="dialog" [attr.aria-label]="title">
        <div class="ps-header">
          <div class="ps-header__content">
            <div class="ps-header__icon" aria-hidden="true">
              @switch (icon) {
                @case ('bank') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/></svg> }
                @case ('box') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
                @case ('pin') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
                @case ('user') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
                @case ('doc') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> }
                @case ('transfer') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> }
                @case ('money') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg> }
                @case ('filter') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
                @case ('chart') { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
                @default { <svg viewBox="0 0 24 24" fill="none" width="30" height="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg> }
              }
            </div>
            <div class="ps-header__text">
              <h2>{{ title }}</h2>
              @if (subtitle) { <p>{{ subtitle }}</p> }
            </div>
          </div>
          <div class="ps-header__actions">
            <ng-content select="[popup-actions]"></ng-content>
            <button type="button" class="ps-close" (click)="close.emit()" title="Fechar" aria-label="Fechar">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="ps-body">
          <div class="ps-panel" [class.ps-panel--plain]="plain">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ps-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center; z-index: 1100; }
    .ps-container { background: #fff; border-radius: 16px; width: 92%; max-height: 92vh; overflow: hidden;
      display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04); }
    .ps-header { background: var(--brand-purple, #6366F1); color: #fff; padding: 20px 28px; display: flex;
      justify-content: space-between; align-items: center; flex-shrink: 0; }
    .ps-header__content { display: flex; align-items: center; gap: 16px; }
    .ps-header__icon { display: flex; opacity: .9; }
    .ps-header__text h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    .ps-header__text p { font-size: 14px; margin: 0; opacity: .9; }
    .ps-header__actions { display: flex; align-items: center; gap: 12px; }
    .ps-close { background: transparent; border: 0; color: #fff; opacity: .8; padding: 8px; cursor: pointer; display: flex; }
    .ps-close:hover { opacity: 1; transform: scale(1.1); }
    .ps-body { padding: 20px 28px 24px; overflow-y: auto; flex: 1; }
    .ps-panel { background: #FAFAFE; border-radius: 12px; padding: 20px; }
    .ps-panel--plain { background: transparent; padding: 0; }
  `],
})
export class PopupShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon: 'bank' | 'box' | 'pin' | 'user' | 'doc' | 'transfer' | 'money' | 'filter' | 'chart' | 'default' = 'default';
  @Input() width = 1000;
  @Input() plain = false;
  @Input() closeOnBackdrop = false;
  @Output() close = new EventEmitter<void>();
}
