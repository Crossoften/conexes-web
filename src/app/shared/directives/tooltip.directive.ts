// src/app/shared/directives/tooltip.directive.ts
// item 22 (reteste 22.09): tooltip instantâneo para os ícones de ação.
// O `title` nativo demora a aparecer; esta diretiva mostra o rótulo na hora ao passar o mouse.
// Uso: <button appTooltip="Visualizar" aria-label="Visualizar"> … </button>
//   ou <button [appTooltip]="expr" [attr.aria-label]="expr"> … </button>
import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2, inject } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') text = '';

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly r    = inject(Renderer2);
  private tip: HTMLElement | null = null;

  @HostListener('mouseenter') onEnter(): void { this.show(); }
  @HostListener('mouseleave') onLeave(): void { this.hide(); }
  @HostListener('click')            onClick(): void  { this.hide(); }
  @HostListener('window:scroll')    onScroll(): void { this.hide(); }
  @HostListener('window:resize')    onResize(): void { this.hide(); }

  private show(): void {
    if (this.tip || !this.text) return;

    const tip = this.r.createElement('div') as HTMLElement;
    this.r.setProperty(tip, 'textContent', this.text);
    const style: Record<string, string> = {
      position: 'fixed', zIndex: '3000', background: '#1f2937', color: '#fff',
      padding: '5px 9px', 'border-radius': '6px', 'font-size': '12px', 'font-weight': '600',
      'line-height': '1.2', 'white-space': 'nowrap', 'pointer-events': 'none',
      'box-shadow': '0 4px 12px rgba(0,0,0,.18)', opacity: '0', transition: 'opacity .08s ease',
    };
    for (const [k, v] of Object.entries(style)) this.r.setStyle(tip, k, v);
    this.r.appendChild(document.body, tip);
    this.tip = tip;

    // Posiciona acima do elemento; se não couber, joga para baixo. Mantém dentro da viewport.
    const rect  = this.host.nativeElement.getBoundingClientRect();
    const tRect = tip.getBoundingClientRect();
    let top = rect.top - tRect.height - 8;
    if (top < 4) top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tRect.width / 2;
    left = Math.max(6, Math.min(left, window.innerWidth - tRect.width - 6));
    this.r.setStyle(tip, 'top',  `${Math.round(top)}px`);
    this.r.setStyle(tip, 'left', `${Math.round(left)}px`);

    requestAnimationFrame(() => { if (this.tip) this.r.setStyle(this.tip, 'opacity', '1'); });
  }

  private hide(): void {
    if (this.tip) { this.r.removeChild(document.body, this.tip); this.tip = null; }
  }

  ngOnDestroy(): void { this.hide(); }
}
