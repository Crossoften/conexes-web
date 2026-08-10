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
  @HostListener('window:pageshow', ['$event'])
  onPageShow(event: PageTransitionEvent): void {
    if (event.persisted && !this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
    }
  }
}
