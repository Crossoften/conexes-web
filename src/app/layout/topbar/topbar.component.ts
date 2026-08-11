// src/app/layout/topbar/topbar.component.ts
import { Component, input, inject, signal, HostListener, ElementRef } from '@angular/core';
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
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  // Fecha o menu ao clicar fora dele.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target)) {
      this.menuOpen.set(false);
    }
  }
}
