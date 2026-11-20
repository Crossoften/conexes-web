// src/app/shared/components/icon-legend/icon-legend.component.ts
import { Component, Input } from '@angular/core';

export interface IconLegendItem { icon: string; name: string; desc: string; }
export interface IconLegendGroup { title: string; items: IconLegendItem[]; }

/**
 * Card #768 (itens 34, 36, 37, 45, 69 — cenários 20, 23, 24 e 35): legenda abaixo
 * da lista com o nome e a função de cada ícone (os botões só de ícone também
 * mostram o nome ao passar o mouse).
 */
@Component({
  selector: 'app-icon-legend',
  standalone: true,
  template: `
    <section class="il" aria-label="Legenda dos ícones">
      <h3 class="il__titulo">Legenda dos ícones</h3>
      @for (g of groups; track g.title) {
        <h4 class="il__grupo">{{ g.title }}</h4>
        <div class="il__grade">
          @for (i of g.items; track i.name) {
            <div class="il__item">
              <span class="il__icone" aria-hidden="true">
                @switch (i.icon) {
                  @case ('excel') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg> }
                  @case ('pdf') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg> }
                  @case ('history') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15 14"/></svg> }
                  @case ('upload') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/><line x1="5" y1="21" x2="19" y2="21"/></svg> }
                  @case ('calendar') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
                  @case ('eye') { <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg> }
                  @case ('edit') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> }
                  @case ('copy') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> }
                  @case ('trash') { <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M4 5h12M6 5V3c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2M7 5v12c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> }
                  @case ('auto') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
                  @case ('bank') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/></svg> }
                  @case ('payable') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> }
                  @case ('receivable') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
                  @case ('entry') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg> }
                  @case ('transfer') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> }
                  @case ('search') { <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> }
                  @case ('ignore') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg> }
                  @case ('check') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
                  @case ('chevron') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> }
                  @case ('chart') { <svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M3 17V9M8 17V4M13 17v-6M18 17V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> }
                  @case ('clip') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> }
                  @case ('filter') { <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> }
                  @default { <span class="il__txt">{{ i.icon }}</span> }
                }
              </span>
              <div><strong>{{ i.name }}</strong><p>{{ i.desc }}</p></div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .il { background: #fff; border: 1px solid var(--surface-border-mid, #E5E7EB); border-radius: 12px; padding: 16px 20px; margin-top: 16px; }
    .il__titulo { font-family: var(--font-display); font-size: 13.5px; font-weight: 700; margin: 0 0 10px; color: var(--text-primary, #111827); }
    .il__grupo { font-size: 12px; font-weight: 700; margin: 10px 0 8px; color: #374151; }
    .il__grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 24px; }
    .il__item { display: flex; gap: 10px; align-items: flex-start; font-size: 12px; color: #6B7280; }
    .il__item strong { display: block; color: #111827; font-size: 12px; }
    .il__item p { margin: 2px 0 0; line-height: 1.35; }
    .il__icone { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: 1px solid #E5E7EB; display: inline-flex; align-items: center; justify-content: center; color: #6B7280; }
    .il__txt { font-size: 10px; font-weight: 700; }
    @media (max-width: 900px) { .il__grade { grid-template-columns: 1fr; } }
  `],
})
export class IconLegendComponent {
  @Input() groups: IconLegendGroup[] = [];
}
