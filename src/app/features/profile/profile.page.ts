// features/profile/profile.page.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    <div class="placeholder-page">
      <div class="placeholder-page__icon">🚧</div>
      <h2 class="placeholder-page__title">Perfil</h2>
      <p class="placeholder-page__desc">Esta tela está sendo desenvolvida.</p>
    </div>
  `,
  styles: [`
    .placeholder-page {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 400px; gap: 12px;
      text-align: center;
    }
    .placeholder-page__icon { font-size: 48px; }
    .placeholder-page__title {
      font-family: 'Sora', sans-serif; font-size: 20px;
      font-weight: 700; color: #1E1B4B;
    }
    .placeholder-page__desc { font-size: 14px; color: #6B7280; }
  `],
})
export class ProfileComponent {}
