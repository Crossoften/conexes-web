// src/app/layout/sidebar/sidebar.component.ts
import { Component, input, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { NAV_ITEMS, NavItem } from './nav.config';
import { SidebarIconComponent } from './sidebar-icon.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, NgClass, SidebarIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  collapsed = input<boolean>(false);

  private router = inject(Router);
  readonly auth  = inject(AuthService);
  readonly navItems = NAV_ITEMS;

  private openItem = signal<string | null>(this.getDefaultOpen());

  isOpen(item: NavItem): boolean {
    if (this.collapsed()) return false;
    const hasActiveChild = item.children?.some(c =>
      this.router.url.startsWith(c.route)
    ) ?? false;
    return hasActiveChild || this.openItem() === item.label;
  }

  isActiveParent(item: NavItem): boolean {
    return item.children?.some(c => this.router.url.startsWith(c.route)) ?? false;
  }

  isActiveChild(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  toggle(label: string): void {
    if (this.collapsed()) return;
    this.openItem.update(cur => cur === label ? null : label);
  }

  trackByLabel(_: number, item: NavItem) { return item.label; }

  private getDefaultOpen(): string | null {
    const url = this.router.url;
    return NAV_ITEMS.find(item =>
      item.children?.some(c => url.startsWith(c.route))
    )?.label ?? NAV_ITEMS.find(i => i.children)?.label ?? null;
  }
}
