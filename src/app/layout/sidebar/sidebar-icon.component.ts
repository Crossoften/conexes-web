// src/app/layout/sidebar/sidebar-icon.component.ts
import { Component, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';

const ICONS: Record<string, string> = {
  dashboard: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,

  registration: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  entities: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 17V8l8-5 8 5v9" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="7" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,

  contracts: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
          stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 7h6M7 10h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M12 13l1.5 1.5L16 12" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  purchasing: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 3h2l2.5 9h9L18 7H6" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="9" cy="16.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="15" cy="16.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,

  financial: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10 6v1m0 6v1M8 10c0-.55.45-1 1-1h2a1 1 0 0 1 0 2H9a1 1 0 0 0 0 2h2a1 1 0 0 0 1-1"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  accountability: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  profile: `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
};

// Cor de fundo + cor do ícone por módulo
export const ICON_COLORS: Record<string, { bg: string; color: string }> = {
  dashboard:      { bg: '#FFF7ED', color: '#F97316' },
  registration:   { bg: '#EDE9FE', color: '#7C3AED' },
  entities:       { bg: '#ECFDF5', color: '#059669' },
  contracts:      { bg: '#EFF6FF', color: '#2563EB' },
  purchasing:     { bg: '#FFF1F2', color: '#E11D48' },
  financial:      { bg: '#F0FDF4', color: '#16A34A' },
  accountability: { bg: '#FFFBEB', color: '#D97706' },
  profile:        { bg: '#F5F3FF', color: '#7C3AED' },
};

@Component({
  selector: 'app-sidebar-icon',
  standalone: true,
  template: `
    <span
      class="icon-wrap"
      [style.background]="iconColors().bg"
      [style.color]="iconColors().color">
      <span [innerHTML]="svg"></span>
    </span>
  `,
  styles: [`
    .icon-wrap {
      width: 34px; height: 34px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 220ms;
    }
    :host ::ng-deep svg { width: 18px; height: 18px; display: block; }
  `],
})
export class SidebarIconComponent {
  name = input.required<string>();

  private sanitizer = inject(DomSanitizer);

  get svg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      ICONS[this.name()] ?? ICONS['dashboard']
    );
  }

  iconColors() {
    return ICON_COLORS[this.name()] ?? ICON_COLORS['dashboard'];
  }
}
