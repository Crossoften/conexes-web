// src/app/layout/sidebar/sidebar.component.ts
import { Component, input, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { NAV_ITEMS, NavItem } from './nav.config';
import { SidebarIconComponent } from './sidebar-icon.component';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { resolveRoutePermission } from './permission-map';

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
  private perms  = inject(PermissionsService);

  // PERM-fix: menu filtrado pelo Perfil de Permissão do usuário. Recalcula quando
  // /my-self atualiza (auth.user()). Master vê tudo; itens sem mapeamento ficam
  // visíveis a todos; grupos sem nenhum filho habilitado e permitido são ocultados.
  readonly navItems = computed<NavItem[]>(() => {
    this.auth.user();
    return NAV_ITEMS
      .map(item => this.filterItem(item))
      .filter((item): item is NavItem => item !== null);
  });

  private canSee(node: { route?: string; perm?: { module: string; subMenu?: string } }): boolean {
    // PERM-fix: override explícito do item de menu tem precedência sobre o mapa de rota
    // (necessário quando dois menus de módulos diferentes compartilham a mesma rota).
    const perm = node.perm ?? resolveRoutePermission(node.route);
    if (!perm) return true; // sem mapeamento → visível a todos
    return this.perms.canView(perm.module, perm.subMenu);
  }

  private filterItem(item: NavItem): NavItem | null {
    if (!item.children) {
      return this.canSee(item) ? item : null;
    }
    const children = item.children.filter(c => this.canSee(c));
    // Só mantém o grupo se sobrar ao menos um filho habilitado (itens "Em breve"
    // desabilitados não seguram o grupo sozinhos).
    const hasEnabledChild = children.some(c => !c.disabled);
    return hasEnabledChild ? { ...item, children } : null;
  }

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
