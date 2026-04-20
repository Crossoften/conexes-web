// src/app/features/auth/register/register.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#7C3AED">
      <div style="background:#fff;border-radius:16px;padding:48px;text-align:center;max-width:400px">
        <h1 style="font-family:'Sora',sans-serif;color:#1E1B4B;margin-bottom:8px">Criar conta</h1>
        <p style="color:#6B7280;margin-bottom:24px">Página em desenvolvimento</p>
        <a routerLink="/auth/login"
           style="color:#7C3AED;font-weight:600;text-decoration:none">
          ← Voltar ao login
        </a>
      </div>
    </div>
  `,
})
export class RegisterPage {}
