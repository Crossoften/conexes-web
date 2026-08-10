// src/app/layout/topbar/topbar.component.ts
import { Component, input, inject, signal, HostListener } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  parentLabel  = input<string | null>(null);
  currentLabel = input<string>('');

  readonly auth = inject(AuthService);

  /** Menu do perfil (dropdown do avatar). */
  readonly menuOpen = signal(false);

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    if (this.menuOpen()) this.menuOpen.set(false);
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout(); // limpa sessão (token + usuário) e redireciona para /auth/login
  }

  // Fecha o menu ao clicar fora ou apertar Esc.
  @HostListener('document:click')
  onDocumentClick(): void { this.closeMenu(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }
}
