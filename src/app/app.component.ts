// src/app/app.component.ts
import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `,
})
export class AppComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * SEG-001: quando a página é restaurada do bfcache do navegador (botão "voltar"),
   * os guards de rota NÃO re-executam. Se a sessão já não é válida, redireciona ao login
   * para não exibir uma tela autenticada em cache após o logout/401.
   */
  /**
   * Card #768 (item 68): uma única regra de calendário — todo campo de data abre o
   * calendário ao clicar, sem precisar digitar. Vale para qualquer tela, inclusive as
   * que ainda não chamavam o seletor por conta própria.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = event.target as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el || el.tagName !== 'INPUT' || el.disabled || el.readOnly) return;
    if (!['date', 'month', 'datetime-local', 'week'].includes(el.type)) return;
    try { el.showPicker?.(); } catch { /* navegador sem showPicker ou já aberto */ }
  }

  /**
   * Card #768 (item 69): todo botão só de ícone mostra o nome ao passar o mouse. Os que
   * já têm nome acessível (aria-label) e nenhuma dica própria ganham o title na hora.
   */
  @HostListener('document:mouseover', ['$event'])
  onDocumentMouseOver(event: MouseEvent): void {
    const el = (event.target as HTMLElement | null)?.closest?.('button, a') as HTMLElement | null;
    if (!el || el.title || el.hasAttribute('data-tip') || el.hasAttribute('data-has-tooltip')) return;
    const nome = el.getAttribute('aria-label');
    if (nome && !(el.textContent ?? '').trim()) el.title = nome;
  }

  @HostListener('window:pageshow', ['$event'])
  onPageShow(event: PageTransitionEvent): void {
    if (event.persisted && !this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
    }
  }
}
