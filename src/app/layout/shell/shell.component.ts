// src/app/layout/shell/shell.component.ts
import { Component, signal, inject, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { NAV_ITEMS } from '../sidebar/nav.config';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private router = inject(Router);

  sidebarCollapsed = signal(false);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  breadcrumb = computed(() => {
    const url = this.currentUrl();
    for (const item of NAV_ITEMS) {
      if (item.children) {
        const child = item.children.find(c => url.startsWith(c.route));
        if (child) return { parent: item.label, current: child.label };
      }
      if (item.route && url.startsWith(item.route)) {
        return { parent: null, current: item.label };
      }
    }
    return { parent: null, current: '' };
  });

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }
}
