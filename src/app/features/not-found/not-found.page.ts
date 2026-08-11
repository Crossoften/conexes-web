// src/app/features/not-found/not-found.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="not-found">
      <div class="not-found__code">404</div>
      <h1 class="not-found__title">Página não encontrada</h1>
      <p class="not-found__text">
        O endereço acessado não existe ou a funcionalidade ainda não está disponível.
      </p>
      <a class="not-found__cta" routerLink="/stakeholders">Voltar para o início</a>
    </section>
  `,
  styles: [`
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 72px 24px;
      gap: 8px;
    }
    .not-found__code {
      font-family: var(--font-display);
      font-size: 88px;
      font-weight: 800;
      line-height: 1;
      background: linear-gradient(135deg, var(--brand-purple), var(--brand-orange));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .not-found__title {
      font-size: 22px;
      margin: 8px 0 0;
      color: var(--text-primary);
    }
    .not-found__text {
      color: var(--text-secondary);
      max-width: 420px;
      margin: 0 0 12px;
    }
    .not-found__cta {
      margin-top: 8px;
      padding: 10px 22px;
      border-radius: 10px;
      background: var(--brand-purple);
      color: #fff;
      font-weight: 600;
      text-decoration: none;
      transition: opacity var(--transition);
    }
    .not-found__cta:hover { opacity: 0.9; }
  `],
})
export class NotFoundPage {}
