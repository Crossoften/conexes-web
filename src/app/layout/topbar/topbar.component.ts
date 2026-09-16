// src/app/layout/topbar/topbar.component.ts
import { Component, input, inject, signal, computed, HostListener, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PermissionsService } from '../../core/auth/permissions.service';
import { ORG_NAV_ITEM } from '../sidebar/nav.config';
import { resolveRoutePermission } from '../sidebar/permission-map';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  parentLabel  = input<string | null>(null);
  currentLabel = input<string>('');

  readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionsService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly menuOpen    = signal(false);
  readonly orgMenuOpen = signal(false);

  // HI-03: itens de "Minha Organização" na barra superior, filtrados por permissão (Master vê tudo).
  readonly orgItems = computed(() => {
    this.auth.user();
    return (ORG_NAV_ITEM.children ?? []).filter(c => {
      const perm = resolveRoutePermission(c.route);
      return !perm || this.perms.canView(perm.module, perm.subMenu);
    });
  });

  toggleMenu(): void {
    this.orgMenuOpen.set(false);
    this.menuOpen.update(v => !v);
  }

  toggleOrgMenu(): void {
    this.menuOpen.set(false);
    this.orgMenuOpen.update(v => !v);
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  // Fecha os menus ao clicar fora deles.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
      this.orgMenuOpen.set(false);
    }
  }
}
