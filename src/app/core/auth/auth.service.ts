// src/app/core/auth/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface AuthUser {
  id:     string;
  name:   string;
  email:  string;
  role:   string;
  avatar: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  private _user = signal<AuthUser | null>(this.loadFromStorage());

  readonly user         = this._user.asReadonly();
  readonly isLoggedIn   = computed(() => this._user() !== null);
  readonly userInitials = computed(() => {
    const name = this._user()?.name ?? '';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  });

  async login(email: string, password: string): Promise<void> {
    await new Promise(r => setTimeout(r, 900));

    if (!email || !password) throw new Error('Credenciais inválidas');

    const user: AuthUser = {
      id:     '1',
      name:   'João Mendes',
      email,
      role:   'Administrador',
      avatar: null,
    };

    this._user.set(user);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem('auth_user');
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return this._user() !== null;
  }

  private loadFromStorage(): AuthUser | null {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}